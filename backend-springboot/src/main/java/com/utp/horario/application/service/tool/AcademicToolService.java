package com.utp.horario.application.service.tool;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.value_objets.ClassSession;
import com.utp.horario.domain.model.value_objets.ScheduleInterval;
import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.application.dtos.AcademicToolDto.*;
import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.repositories.IStudentRepository;
import com.utp.horario.domain.model.repositories.ISyllabusRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AcademicToolService {

    private final IScheduleRepository scheduleRepositoryPort;
    private final ISyllabusRepository syllabusRepositoryPort;
    private final IStudentRepository studentRepositoryPort;
    private final IUtpPortalGateway utpPortalGatewayPort;
    private final ObjectMapper objectMapper;



    public String resolveEffectiveStudentCode(String studentCode) {
        if (studentCode != null && !studentCode.isBlank() && !"current-student".equalsIgnoreCase(studentCode)) {
            return studentCode.trim().toUpperCase();
        }
        return null;
    }

    /**
     * Tool 1: Obtiene las clases del estudiante para una fecha determinada.
     * Soporta fallback automático a MySQL si no se encuentra en el repositorio en memoria.
     */
    public DayScheduleResult getTodaySchedule(String studentCode, String dateIso) {
        studentCode = resolveEffectiveStudentCode(studentCode);
        java.time.ZoneId LIMA = java.time.ZoneId.of("America/Lima");
        LocalDate today = (dateIso != null && !dateIso.isBlank())
                ? LocalDate.parse(dateIso)
                : LocalDate.now(LIMA);

        if (studentCode == null || studentCode.isBlank()) {
            return new DayScheduleResult("", today.toString(), 0, List.of(),
                    "No se identificó una sesión de estudiante activa. Inicia sesión para consultar tu horario personal.");
        }

        DayOfWeek dayOfWeek = today.getDayOfWeek();
        log.info("[AcademicTool] 📅 Consultando horario de hoy: fecha={}, día={}, studentCode={}", today, dayOfWeek, studentCode);

        List<ClassSessionDto> dayClasses = new ArrayList<>();

        // 1. Intento desde repositorio local MySQL / L1 Cache
        Optional<ScheduleInterval> scheduleOpt = scheduleRepositoryPort.findByStudentIdAndPeriod(studentCode, "2026 - Ciclo 2 Agosto");



        if (scheduleOpt.isPresent() && scheduleOpt.get().getClasses() != null) {
            for (ClassSession c : scheduleOpt.get().getClasses()) {
                boolean matchesDay = false;
                if (c.getStartAt() != null) {
                    // SOLO fecha exacta — no por dayOfWeek (causaría duplicar todos los sábados del ciclo)
                    if (c.getStartAt().toLocalDate().equals(today)) {
                        matchesDay = true;
                    }
                }

                if (matchesDay) {
                    String startTimeStr = c.getStartAt() != null ? c.getStartAt().format(DateTimeFormatter.ofPattern("HH:mm")) : "08:00";
                    String endTimeStr = c.getFinishAt() != null ? c.getFinishAt().format(DateTimeFormatter.ofPattern("HH:mm")) : "10:00";

                    dayClasses.add(new ClassSessionDto(
                            c.getCourseCode() != null ? c.getCourseCode() : "",
                            c.getCourseName() != null ? c.getCourseName() : "Clase UTP",
                            startTimeStr,
                            endTimeStr,
                            c.getBuilding() != null && !c.getBuilding().isBlank() ? c.getBuilding() : "Campus UTP",
                            c.getClassroom() != null && !c.getClassroom().isBlank() ? c.getClassroom() : "Aula Asignada",
                            c.getTeacher() != null && !c.getTeacher().isBlank() ? c.getTeacher() : "Docente UTP"
                    ));
                }
            }
        }

        log.info("[AcademicTool] 🔎 Clases encontradas para hoy ({}): {}", dayOfWeek, dayClasses.size());

        String message = dayClasses.isEmpty()
                ? "No tienes clases programadas para el día de hoy (" + dayOfWeek + " " + today + ")."
                : null;

        return new DayScheduleResult(studentCode, today.toString(), dayClasses.size(), dayClasses, message);
    }

    private String resolveStudentToken(String studentCode) {
        studentCode = resolveEffectiveStudentCode(studentCode);
        // 1. Caché en memoria del gateway (registrado en cada request SSE)
        String token = utpPortalGatewayPort.getStudentToken(studentCode);
        if (token != null && !token.isBlank()) {
            log.debug("[AcademicTool] 🔑 Token resuelto desde caché gateway para [{}] (len={})", studentCode, token.length());
            return token;
        }
        // 2. BD MySQL (via StudentRepository)
        if (studentCode != null && !studentCode.isBlank()) {
            String dbToken = studentRepositoryPort.findByStudentCode(studentCode)
                    .map(StudentProfile::getToken)
                    .filter(t -> t != null && !t.isBlank())
                    .orElse(null);
            if (dbToken != null) {
                log.debug("[AcademicTool] 🔑 Token resuelto desde BD local para [{}] (len={})", studentCode, dbToken.length());
                return dbToken;
            }
        }
        log.warn("[AcademicTool] ⚠️ TOKEN NULO para [{}] — los fallbacks a API externa serán saltados", studentCode);
        return null;
    }

    /**
     * Tool 0: Obtiene la lista de cursos en los que el estudiante está matriculado.
     * Consulta fetchCoursesSummary(token) de la API Externa como fuente primaria institucional.
     */
    public EnrolledCoursesResult getEnrolledCourses(String studentCode) {
        studentCode = resolveEffectiveStudentCode(studentCode);
        if (studentCode == null || studentCode.isBlank()) {
            return new EnrolledCoursesResult("", 0, List.of(),
                    "No se identificó una sesión de estudiante activa. Inicia sesión para consultar tus asignaturas.");
        }
        log.info("[AcademicTool] 🎓 Consultando cursos matriculados para alumno {}", studentCode);

        // 1. Fuente Primaria Institucional: API Externa Gateway /courses/summary
        String token = resolveStudentToken(studentCode);
        if (token != null && !token.isBlank()) {
            try {
                List<CourseSummaryDto> summaries = utpPortalGatewayPort.fetchCoursesSummary(token);
                if (summaries != null && !summaries.isEmpty()) {
                    List<EnrolledCourseDto> courses = summaries.stream()
                            .map(s -> new EnrolledCourseDto(
                                    (s.courseCode() != null && !s.courseCode().isBlank()) ? s.courseCode() : s.courseId(),
                                    s.courseName()
                            ))
                            .distinct()
                            .toList();
                    log.info("[AcademicTool] 🏛️ {} cursos oficiales obtenidos desde API Externa Gateway para [{}]", courses.size(), studentCode);
                    return new EnrolledCoursesResult(studentCode, courses.size(), courses);
                }
            } catch (Exception e) {
                log.warn("[AcademicTool] ⚠️ Error consultando API Externa /courses/summary para [{}]: {}", studentCode, e.getMessage());
            }
        }

        // 2. Base de datos (MySQL / Caché local)
        Optional<ScheduleInterval> scheduleOpt = scheduleRepositoryPort.findByStudentIdAndPeriod(studentCode, "2026 - Ciclo 2 Agosto");

        List<EnrolledCourseDto> courses = new ArrayList<>();
        if (scheduleOpt.isPresent()) {
            ScheduleInterval schedule = scheduleOpt.get();
            // Prioridad 1: campo courses explícito
            if (schedule.getCourses() != null && !schedule.getCourses().isEmpty()) {
                for (var c : schedule.getCourses()) {
                    courses.add(new EnrolledCourseDto(c.getCode(), c.getName()));
                }
            }
            // Prioridad 2: derivar cursos únicos desde las sesiones (estructura persistida en MySQL)
            if (courses.isEmpty() && schedule.getClasses() != null) {
                java.util.LinkedHashMap<String, String> seen = new java.util.LinkedHashMap<>();
                for (var cl : schedule.getClasses()) {
                    String code = cl.getCourseCode() != null ? cl.getCourseCode().trim() : "";
                    String name = cl.getCourseName() != null ? cl.getCourseName().trim() : code;
                    if (!code.isBlank()) {
                        seen.putIfAbsent(code, name);
                    }
                }
                seen.forEach((code, name) -> courses.add(new EnrolledCourseDto(code, name)));
            }
        }
        log.info("[AcademicTool] 📚 Cursos matriculados encontrados (fallback): {}", courses.size());
        return new EnrolledCoursesResult(studentCode, courses.size(), courses);
    }

    /**
     * Tool 2: Obtiene los detalles de un sílabo (fórmula, logro, ponderaciones y temario).
     * Soporta búsqueda por código exacto o nombre en lenguaje natural (ej. 'desarrollo web').
     * Aprovecha fetchSyllabusMarkdown de la API Externa para obtener el contenido completo en Markdown listo para LLM.
     */
    public SyllabusDetailsResult getSyllabusDetails(String courseQuery) {
        return getSyllabusDetails(null, courseQuery);
    }

    public SyllabusDetailsResult getSyllabusDetails(String studentCode, String courseQuery) {
        studentCode = resolveEffectiveStudentCode(studentCode);
        log.info("[AcademicTool] 📚 Consultando sílabo de curso: {} (alumno: {})", courseQuery, studentCode);
        String cleanQuery = (courseQuery != null) ? courseQuery.trim() : "";

        // 1. Resolver código/nombre exacto desde los cursos matriculados del alumno (PRIORIDAD ALTA)
        //    Esto garantiza que el contexto de "qué clase tiene hoy" se resuelva correctamente.
        String resolvedCourseCode = null;
        String resolvedCourseName = null;
        EnrolledCoursesResult enrolled = null;
        if (studentCode != null && !studentCode.isBlank()) {
            try {
                enrolled = getEnrolledCourses(studentCode);
                if (enrolled != null && enrolled.courses() != null) {
                    String normQuery = normalizeTerm(cleanQuery);
                    for (var ec : enrolled.courses()) {
                        String normEcName = normalizeTerm(ec.courseName());
                        String normEcCode = normalizeTerm(ec.courseCode());
                        if (normEcName.contains(normQuery) || normQuery.contains(normEcName)
                                || normEcCode.equalsIgnoreCase(normQuery)) {
                            resolvedCourseCode = ec.courseCode();
                            resolvedCourseName = ec.courseName();
                            log.info("[AcademicTool] ✅ Curso resuelto desde matriculados: {} ({})", resolvedCourseName, resolvedCourseCode);
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("[AcademicTool] ⚠️ No se pudo resolver curso desde cursos matriculados: {}", e.getMessage());
            }
        }

        // 2. Buscar por código resuelto en repositorio (MySQL)
        Optional<Syllabus> syllabusOpt = Optional.empty();
        if (resolvedCourseCode != null) {
            syllabusOpt = syllabusRepositoryPort.findByCourseCode(resolvedCourseCode.toUpperCase());
        }

        // 3. Fallback: buscar por query original en repositorio (MySQL)
        if (syllabusOpt.isEmpty()) {
            syllabusOpt = syllabusRepositoryPort.findByCourseCode(cleanQuery.toUpperCase());
        }

        String courseCode = syllabusOpt.map(Syllabus::getCourseCode)
                .orElse(resolvedCourseCode != null ? resolvedCourseCode : cleanQuery);

        if (syllabusOpt.isPresent()) {
            log.info("[AcademicTool] 📚 [PASO 2/3 HIT] Sílabo '{}' hallado en MySQL/BD local. Semanas: {}, Evaluaciones: {}",
                    courseCode,
                    syllabusOpt.get().getWeeklySchedule() != null ? syllabusOpt.get().getWeeklySchedule().size() : 0,
                    syllabusOpt.get().getEvaluations() != null ? syllabusOpt.get().getEvaluations().size() : 0);
        } else {
            log.info("[AcademicTool] ❌ [PASO 2/3 MISS] Sílabo '{}' no encontrado en MySQL/BD local. Pasando a fallback API Externa...", courseCode);
        }

        // PASO 4: Markdown de la API Externa
        String markdown = "";
        String tokenForExternalApi = resolveStudentToken(studentCode);
        try {
            if (tokenForExternalApi != null && !tokenForExternalApi.isBlank() && courseCode != null && !courseCode.isBlank()) {
                log.info("[AcademicTool] 📶 [PASO 4a] Intentando Markdown desde API Externa para [{}]...", courseCode);
                markdown = utpPortalGatewayPort.fetchSyllabusMarkdown(tokenForExternalApi, courseCode);
                if (markdown != null && !markdown.isBlank()) {
                    log.info("[AcademicTool] ✅ [PASO 4a HIT] Markdown obtenido para [{}] ({} caracteres)", courseCode, markdown.length());
                } else {
                    log.info("[AcademicTool] ❌ [PASO 4a MISS] Markdown vacío para [{}] — endpoint /markdown puede no soportar este código", courseCode);
                }
            } else {
                log.warn("[AcademicTool] ⏭️ [PASO 4a SKIP] Markdown saltado — token={}", tokenForExternalApi != null ? "presente" : "NULO");
            }
        } catch (Exception e) {
            log.warn("[AcademicTool] ⚠️ [PASO 4a ERROR] fetchSyllabusMarkdown falló para [{}]: {}", courseCode, e.getMessage());
        }

        // PASO 4b: fetchSyllabus() JSON estructurado — último recurso antes de "not found"
        if (syllabusOpt.isEmpty() && (markdown == null || markdown.isBlank())) {
            try {
                if (tokenForExternalApi != null && !tokenForExternalApi.isBlank()) {
                    String codeToTry = resolvedCourseCode != null ? resolvedCourseCode : cleanQuery;
                    log.info("[AcademicTool] 🔄 [PASO 4b] fetchSyllabus() JSON para [{}]...", codeToTry);
                    Syllabus apiSyllabus = utpPortalGatewayPort.fetchSyllabus(tokenForExternalApi, codeToTry, null, null);
                    if (apiSyllabus != null) {
                        syllabusOpt = Optional.of(apiSyllabus);
                        log.info("[AcademicTool] ✅ [PASO 4b HIT] fetchSyllabus() exitoso para [{}]. Semanas={}, Evals={}",
                                codeToTry,
                                apiSyllabus.getWeeklySchedule() != null ? apiSyllabus.getWeeklySchedule().size() : 0,
                                apiSyllabus.getEvaluations() != null ? apiSyllabus.getEvaluations().size() : 0);
                        try {
                            syllabusRepositoryPort.save(apiSyllabus);
                            log.info("[AcademicTool] 💾 Sílabo [{}] persistido en base de datos (MySQL)", codeToTry);
                        } catch (Exception persistEx) {
                            log.debug("[AcademicTool] No se pudo persistir sílabo en base de datos: {}", persistEx.getMessage());
                        }
                    } else {
                        log.warn("[AcademicTool] ❌ [PASO 4b MISS] fetchSyllabus() devolvió null para [{}] — API Externa no tiene este sílabo", codeToTry);
                    }
                } else {
                    log.warn("[AcademicTool] ⏭️ [PASO 4b SKIP] fetchSyllabus() saltado — TOKEN NULO. El alumno debe iniciar sesión.");
                }
            } catch (Exception apiEx) {
                log.warn("[AcademicTool] ⚠️ [PASO 4b ERROR] fetchSyllabus() lanzó excepción para [{}]: {}", cleanQuery, apiEx.getMessage());
            }
        }

        if (syllabusOpt.isEmpty() && (markdown == null || markdown.isBlank())) {
            log.warn("[AcademicTool] 🚫 [RESULTADO FINAL] Sílabo NO encontrado para '{}' tras agotar todos los pasos (MySQL + Markdown + fetchSyllabus)", cleanQuery);
            String suggestion = "";
            if (enrolled != null && enrolled.courses() != null && !enrolled.courses().isEmpty()) {
                suggestion = " Cursos disponibles: " + enrolled.courses().stream().map(EnrolledCourseDto::courseName).toList();
            }
            return new SyllabusDetailsResult(
                    cleanQuery,
                    "Curso no encontrado",
                    0,
                    "",
                    "No se encontró el sílabo registrado para '" + cleanQuery + "'." + suggestion,
                    List.of(),
                    List.of(),
                    null
            );
        }

        // Fuente ganadora del sílabo
        String source = syllabusOpt.isPresent() ? "MySQL-Repository" : "Markdown-API";
        log.info("[AcademicTool] ✅ [RESULTADO FINAL] Sílabo '{}' servido desde [{}]", cleanQuery, source);

        Syllabus s = syllabusOpt.orElseGet(() -> {
            Syllabus fallback = new Syllabus();
            fallback.setCourseCode(courseCode);
            fallback.setCourseName(cleanQuery.toUpperCase());
            fallback.setCredits(3);
            fallback.setFormula("");
            fallback.setLearningGoal("Obtenido directamente desde el Sílabo Oficial UTP");
            return fallback;
        });

        List<EvaluationSummaryDto> evals = s.getEvaluations() != null ? s.getEvaluations().stream()
                .map(e -> new EvaluationSummaryDto(
                        s.getCourseCode(),
                        s.getCourseName(),
                        e.getType(),
                        e.getDescription(),
                        e.getWeightPercent() != null ? e.getWeightPercent() : 0,
                        e.getWeek() != null ? e.getWeek() : 1
                )).toList() : List.of();

        List<WeeklySessionDto> weekly = s.getWeeklySchedule() != null ? s.getWeeklySchedule().stream()
                .map(w -> new WeeklySessionDto(
                        w.getWeek() != null ? w.getWeek() : 0,
                        w.getUnit() != null ? w.getUnit() : "",
                        w.getTopic() != null ? w.getTopic() : "",
                        w.getActivities() != null ? w.getActivities() : "",
                        w.getEvaluation()
                )).toList() : List.of();

        return new SyllabusDetailsResult(
                s.getCourseCode(),
                s.getCourseName(),
                s.getCredits() != null ? s.getCredits() : 3,
                s.getFormula() != null ? s.getFormula() : "",
                s.getLearningGoal() != null ? s.getLearningGoal() : "No especificado",
                evals,
                weekly,
                (markdown != null && !markdown.isBlank()) ? markdown : null
        );
    }

    /**
     * Tool 3: Obtiene las evaluaciones próximas del alumno.
     * Usa fetchUpcomingEvaluations(token, 5) de la API Externa como fuente prioritaria de tareas y exámenes calificados.
     */
    public List<EvaluationSummaryDto> getUpcomingEvaluations(String studentCode, int currentWeek) {
        studentCode = resolveEffectiveStudentCode(studentCode);
        if (studentCode == null || studentCode.isBlank()) {
            return List.of();
        }
        log.info("[AcademicTool] 🎯 Consultando evaluaciones próximas para alumno {} desde semana {}", studentCode, currentWeek);

        // 1. Fuente Prioritaria Institucional: API Externa Gateway /tasks/upcoming?limit=5
        String token = resolveStudentToken(studentCode);
        if (token != null && !token.isBlank()) {
            try {
                List<UpcomingEvaluationDto> externalUpcoming = utpPortalGatewayPort.fetchUpcomingEvaluations(token, 5);
                if (externalUpcoming != null && !externalUpcoming.isEmpty()) {
                    List<EvaluationSummaryDto> mapped = new ArrayList<>();
                    for (UpcomingEvaluationDto u : externalUpcoming) {
                        String code = (u.courseId() != null && !u.courseId().isBlank()) ? u.courseId() : "";
                        String type = (u.evaluationSystem() != null && !u.evaluationSystem().isBlank()) 
                                ? u.evaluationSystem() 
                                : ((u.activityType() != null && !u.activityType().isBlank()) ? u.activityType() : "EVALUACION");
                        
                        String urgencyNote = (u.urgency() != null && !u.urgency().isBlank()) ? " (" + u.urgency() + ")" : "";
                        String desc = (u.title() != null ? u.title() : "Evaluación UTP") + urgencyNote;
                        
                        int week = u.weekNumber() > 0 ? u.weekNumber() : currentWeek;
                        
                        mapped.add(new EvaluationSummaryDto(
                                code,
                                u.courseName() != null ? u.courseName() : "Curso UTP",
                                type,
                                desc,
                                0,
                                week
                        ));
                    }
                    log.info("[AcademicTool] 🏛️ {} evaluaciones próximas obtenidas de API Externa Gateway para [{}]", mapped.size(), studentCode);
                    return mapped;
                }
            } catch (Exception e) {
                log.warn("[AcademicTool] ⚠️ Error consultando API Externa /tasks/upcoming para [{}]: {}", studentCode, e.getMessage());
            }
        }

        // 2. Fallback: Cálculo local y MySQL a partir de sílabos
        log.info("[AcademicTool] ℹ️ Usando fallback de sílabos para evaluaciones próximas de [{}]...", studentCode);
        List<EvaluationSummaryDto> upcoming = new ArrayList<>();
        EnrolledCoursesResult enrolled = getEnrolledCourses(studentCode);
        List<EnrolledCourseDto> courseList = enrolled.courses();

        for (EnrolledCourseDto course : courseList) {
            String code = course.courseCode();
            Optional<Syllabus> sylOpt = syllabusRepositoryPort.findByCourseCode(code);

            if (sylOpt.isPresent() && sylOpt.get().getEvaluations() != null) {
                sylOpt.get().getEvaluations().stream()
                        .filter(e -> e.getWeek() != null && e.getWeek() >= currentWeek && e.getWeek() <= currentWeek + 3)
                        .forEach(e -> upcoming.add(new EvaluationSummaryDto(
                                code,
                                course.courseName(),
                                e.getType(),
                                e.getDescription(),
                                e.getWeightPercent() != null ? e.getWeightPercent() : 0,
                                e.getWeek() != null ? e.getWeek() : 1
                        )));
            }
        }
        log.info("[AcademicTool] 🎯 Evaluaciones próximas encontradas en fallback: {}", upcoming.size());
        return upcoming;
    }



    private String normalizeTerm(String text) {
        if (text == null) return "";
        String nfd = java.text.Normalizer.normalize(text.trim().toLowerCase(), java.text.Normalizer.Form.NFD);
        return nfd.replaceAll("\\p{InCombiningDiacriticalMarks}+", "").replaceAll("\\s+", " ").trim();
    }


}

