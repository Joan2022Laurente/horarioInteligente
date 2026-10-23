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
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AcademicToolService {

    /**
     * Periodo lectivo por defecto. Es la misma etiqueta que la capa de persistencia escribe en
     * {@code student_schedules.period_name}, de modo que la lectura del Read Model y la escritura
     * del Command Model permanecen simetricas.
     */
    public static final String DEFAULT_PERIOD_NAME = "2026 - Ciclo 2 Agosto";

    /** Zona horaria institucional de la universidad. */
    public static final ZoneId LIMA_ZONE = ZoneId.of("America/Lima");

    /** Rango lectivo valido de semanas (1 a 18). */
    public static final int MIN_CURRENT_WEEK = 1;
    public static final int MAX_CURRENT_WEEK = 18;

    private final IScheduleRepository scheduleRepository;
    private final ISyllabusRepository syllabusRepository;
    private final IStudentRepository studentRepository;
    private final IUtpPortalGateway utpPortalGateway;
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

        LocalDate today;
        try {
            today = (dateIso != null && !dateIso.isBlank())
                    ? LocalDate.parse(dateIso.trim(), DateTimeFormatter.ISO_LOCAL_DATE)
                    : LocalDate.now(LIMA_ZONE);
        } catch (DateTimeParseException e) {
            log.warn("[AcademicTool] Formato de fecha invalido '{}'. Se espera YYYY-MM-DD.", dateIso);
            return new DayScheduleResult(studentCode == null ? "" : studentCode,
                    dateIso == null ? "" : dateIso.trim(),
                    0, List.of(),
                    "Formato de fecha invalido: '" + dateIso + "'. Se espera una fecha ISO en formato YYYY-MM-DD.");
        }

        if (studentCode == null || studentCode.isBlank()) {
            return new DayScheduleResult("", today.toString(), 0, List.of(),
                    "No se identificó una sesión de estudiante activa. Inicia sesión para consultar tu horario personal.");
        }

        DayOfWeek dayOfWeek = today.getDayOfWeek();
        log.info("[AcademicTool] 📅 Consultando horario de hoy: fecha={}, día={}, studentCode={}", today, dayOfWeek, studentCode);

        List<ClassSessionDto> dayClasses = new ArrayList<>();
        Integer weekNumber = null;

        // 1. Intento desde repositorio local MySQL / L1 Cache
        Optional<ScheduleInterval> scheduleOpt = scheduleRepository.findByStudentIdAndPeriod(studentCode, DEFAULT_PERIOD_NAME);



        if (scheduleOpt.isPresent() && scheduleOpt.get().getClasses() != null) {
            weekNumber = scheduleOpt.get().getWeekNumber();
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

        return new DayScheduleResult(studentCode, today.toString(), dayClasses.size(), dayClasses, message, weekNumber);
    }

    /**
     * Resuelve la semana lectiva vigente del estudiante a partir del snapshot persistido del
     * horario. Constituye la fuente autoritativa del ancla temporal para el agente: sin ella,
     * el modelo no puede determinar qué semana corresponde a "esta semana".
     *
     * @param studentCode codigo institucional del estudiante
     * @return semana lectiva vigente, o {@code null} si no hay horario persistido
     */
    public Integer resolveCurrentWeek(String studentCode) {
        String code = resolveEffectiveStudentCode(studentCode);
        if (code == null || code.isBlank()) {
            return null;
        }
        try {
            return scheduleRepository.findByStudentIdAndPeriod(code, DEFAULT_PERIOD_NAME)
                    .map(ScheduleInterval::getWeekNumber)
                    .orElse(null);
        } catch (Exception e) {
            log.warn("[AcademicTool] No se pudo resolver la semana lectiva vigente de [{}]: {}", code, e.getMessage());
            return null;
        }
    }

    private String resolveStudentToken(String studentCode) {
        studentCode = resolveEffectiveStudentCode(studentCode);
        // 1. Caché en memoria del gateway (registrado en cada request SSE)
        String token = utpPortalGateway.getStudentToken(studentCode);
        if (token != null && !token.isBlank()) {
            log.debug("[AcademicTool] 🔑 Token resuelto desde caché gateway para [{}] (len={})", studentCode, token.length());
            return token;
        }
        // 2. BD MySQL (via StudentRepository)
        if (studentCode != null && !studentCode.isBlank()) {
            String dbToken = studentRepository.findByStudentCode(studentCode)
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
                List<CourseSummaryDto> summaries = utpPortalGateway.fetchCoursesSummary(token);
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
        Optional<ScheduleInterval> scheduleOpt = scheduleRepository.findByStudentIdAndPeriod(studentCode, DEFAULT_PERIOD_NAME);

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
        if (courses.isEmpty()) {
            String message = "No se encontraron asignaturas persistidas para el estudiante " + studentCode
                    + ". Sincroniza el horario desde la aplicacion para habilitar esta consulta.";
            return new EnrolledCoursesResult(studentCode, 0, courses, message);
        }
        return new EnrolledCoursesResult(studentCode, courses.size(), courses);
    }

    /**
     * Tool 2: Obtiene el sílabo de un curso por código exacto o nombre en lenguaje natural.
     *
     * <p><b>DEPRECADO — usar el overload con {@code studentCode}.</b> La variante sin código de
     * estudiante pierde la resolución contra los cursos matriculados y el token de sesión del portal
     * UTP, por lo que el sílabo no puede recuperarse ni desde MySQL ni desde la API externa.
     * Se conserva únicamente por compatibilidad binaria y se retirará en la próxima versión mayor.
     *
     * @see #getSyllabusDetails(String, String)
     */
    @Deprecated
    public SyllabusDetailsResult getSyllabusDetails(String courseQuery) {
        return getSyllabusDetails(null, courseQuery);
    }

    public SyllabusDetailsResult getSyllabusDetails(String studentCode, String courseQuery) {
        return getSyllabusDetails(studentCode, courseQuery, null);
    }

    /**
     * Obtiene el sílabo oficial de un curso acotado opcionalmente a una semana lectiva.
     *
     * <p>El filtro por semana existe para responder consultas de alcance temporal concreto
     * ("¿qué temas tocan esta semana?") de forma determinista en el servidor, sin depender de
     * que el modelo discrimine por sí mismo entre la semana vigente y el cronograma completo.
     * Si {@code week} es {@code null} el comportamiento es idéntico al histórico: se devuelve
     * el sílabo íntegro con las dieciocho semanas.</p>
     *
     * @param studentCode codigo institucional del estudiante
     * @param courseQuery codigo de catalogo o denominacion natural del curso
     * @param week        semana lectiva (1 a 18) o {@code null} para el sílabo completo
     * @return detalle del sílabo acotado a la semana solicitada
     */
    public SyllabusDetailsResult getSyllabusDetails(String studentCode, String courseQuery, Integer week) {
        studentCode = resolveEffectiveStudentCode(studentCode);
        log.info("[AcademicTool] 📚 Consultando sílabo de curso: {} (alumno: {})", courseQuery, studentCode);
        String cleanQuery = (courseQuery != null) ? courseQuery.trim() : "";

        if (cleanQuery.isBlank()) {
            log.warn("[AcademicTool] Consulta de sílabo sin argumento 'course_query'.");
            return new SyllabusDetailsResult(
                    "",
                    "Curso no especificado",
                    0,
                    "",
                    "Argumento obligatorio 'course_query' ausente: envia el codigo oficial de la asignatura "
                            + "(ej. 100000SI58) o su nombre natural.",
                    List.of(),
                    List.of(),
                    null
            );
        }

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
            syllabusOpt = syllabusRepository.findByCourseCode(resolvedCourseCode.toUpperCase());
        }

        // 3. Fallback: buscar por query original en repositorio (MySQL)
        if (syllabusOpt.isEmpty()) {
            syllabusOpt = syllabusRepository.findByCourseCode(cleanQuery.toUpperCase());
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
                markdown = utpPortalGateway.fetchSyllabusMarkdown(tokenForExternalApi, courseCode);
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
                    Syllabus apiSyllabus = utpPortalGateway.fetchSyllabus(tokenForExternalApi, codeToTry, null, null);
                    // Regla de honestidad de datos: solo un sílabo con contenido curricular
                    // verificable se adopta como resultado y se persiste. Un objeto vacío
                    // o fabricado de la pasarela se trata como MISS: no alimenta la
                    // respuesta del agente ni envenena MySQL.
                    if (apiSyllabus != null && apiSyllabus.isComplete()) {
                        syllabusOpt = Optional.of(apiSyllabus);
                        log.info("[AcademicTool] ✅ [PASO 4b HIT] fetchSyllabus() exitoso para [{}]. Semanas={}, Evals={}",
                                codeToTry,
                                apiSyllabus.getWeeklySchedule() != null ? apiSyllabus.getWeeklySchedule().size() : 0,
                                apiSyllabus.getEvaluations() != null ? apiSyllabus.getEvaluations().size() : 0);
                        try {
                            syllabusRepository.save(apiSyllabus);
                            log.info("[AcademicTool] 💾 Sílabo [{}] persistido en base de datos (MySQL)", codeToTry);
                        } catch (Exception persistEx) {
                            log.debug("[AcademicTool] No se pudo persistir sílabo en base de datos: {}", persistEx.getMessage());
                        }
                    } else {
                        log.warn("[AcademicTool] ❌ [PASO 4b MISS] fetchSyllabus() devolvió un sílabo sin contenido verificable para [{}] — no se adopta ni se persiste nada fabricado",
                                codeToTry);
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

        return applyWeekFilter(new SyllabusDetailsResult(
                s.getCourseCode(),
                s.getCourseName(),
                s.getCredits() != null ? s.getCredits() : 3,
                s.getFormula() != null ? s.getFormula() : "",
                s.getLearningGoal() != null ? s.getLearningGoal() : "No especificado",
                evals,
                weekly,
                (markdown != null && !markdown.isBlank()) ? markdown : null
        ), week);
    }

    /**
     * Acota el detalle de un sílabo a una semana lectiva concreta.
     *
     * <p>El filtro se aplica en el servidor para que la respuesta del agente sea acotada por
     * construcción, con independencia del grado de obediencia del modelo. Cuando la semana no
     * se especifica, el sílabo se devuelve íntegro.</p>
     *
     * @param result sílabo completo
     * @param week   semana lectiva solicitada, o {@code null}
     * @return sílabo acotado a la semana, o el original si no procede filtrar
     */
    private SyllabusDetailsResult applyWeekFilter(SyllabusDetailsResult result, Integer week) {
        if (result == null || week == null || week < MIN_CURRENT_WEEK || week > MAX_CURRENT_WEEK) {
            return result;
        }
        List<WeeklySessionDto> weekly = result.weeklySchedule() == null
                ? List.of()
                : result.weeklySchedule().stream().filter(s -> s.week() == week).toList();
        List<EvaluationSummaryDto> evaluations = result.evaluations() == null
                ? List.of()
                : result.evaluations().stream().filter(e -> e.weekScheduled() == week).toList();
        log.info("[AcademicTool] Sílabo acotado a la semana {}: {} sesión(es), {} evaluación(es).",
                week, weekly.size(), evaluations.size());
        return new SyllabusDetailsResult(
                result.courseCode(),
                result.courseName(),
                result.credits(),
                result.formula(),
                result.learningGoal(),
                evaluations,
                weekly,
                result.markdown()
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
        int week = clampCurrentWeek(currentWeek);
        log.info("[AcademicTool] 🎯 Consultando evaluaciones próximas para alumno {} desde semana {}", studentCode, week);

        // 1. Fuente Prioritaria Institucional: API Externa Gateway /tasks/upcoming?limit=5
        String token = resolveStudentToken(studentCode);
        if (token != null && !token.isBlank()) {
            try {
                List<UpcomingEvaluationDto> externalUpcoming = utpPortalGateway.fetchUpcomingEvaluations(token, 5);
                if (externalUpcoming != null && !externalUpcoming.isEmpty()) {
                    List<EvaluationSummaryDto> mapped = new ArrayList<>();
                    for (UpcomingEvaluationDto u : externalUpcoming) {
                        String code = (u.courseId() != null && !u.courseId().isBlank()) ? u.courseId() : "";
                        String type = (u.evaluationSystem() != null && !u.evaluationSystem().isBlank()) 
                                ? u.evaluationSystem() 
                                : ((u.activityType() != null && !u.activityType().isBlank()) ? u.activityType() : "EVALUACION");
                        
                        String urgencyNote = (u.urgency() != null && !u.urgency().isBlank()) ? " (" + u.urgency() + ")" : "";
                        String desc = (u.title() != null ? u.title() : "Evaluación UTP") + urgencyNote;
                        
                        int evaluationWeek = u.weekNumber() > 0 ? u.weekNumber() : week;
                        
                        mapped.add(new EvaluationSummaryDto(
                                code,
                                u.courseName() != null ? u.courseName() : "Curso UTP",
                                type,
                                desc,
                                0,
                                evaluationWeek
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
            Optional<Syllabus> sylOpt = syllabusRepository.findByCourseCode(code);

            if (sylOpt.isPresent() && sylOpt.get().getEvaluations() != null) {
                sylOpt.get().getEvaluations().stream()
                        .filter(e -> e.getWeek() != null && e.getWeek() >= week && e.getWeek() <= week + 3)
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

    /**
     * Normaliza la semana lectiva al rango institucional valido (1 a 18).
     *
     * @param currentWeek semana solicitada por el cliente
     * @return semana acotada al rango lectivo
     */
    public int clampCurrentWeek(int currentWeek) {
        if (currentWeek < MIN_CURRENT_WEEK) {
            return MIN_CURRENT_WEEK;
        }
        if (currentWeek > MAX_CURRENT_WEEK) {
            return MAX_CURRENT_WEEK;
        }
        return currentWeek;
    }

    /**
     * Resuelve la identidad de un estudiante contra el registro persistido en la base de datos
     * relacional (Aiven Cloud MySQL).
     *
     * <p>Este metodo habilita el modo demostracion del servidor MCP: cuando no existe un token de
     * sesion UTP activo, la identidad se respalda en el registro ya persistido por el estudiante.
     * No se sintetiza ni se infiere ninguna informacion: si el estudiante no tiene registro, el
     * metodo devuelve {@code null} y el llamador responde con un mensaje informativo explicito.
     *
     * @param candidate codigo institucional propuesto por el cliente
     * @return codigo canonical persistido, o {@code null} si no existe registro
     */
    public String resolvePersistedStudentCode(String candidate) {
        if (candidate == null || candidate.isBlank()) {
            return null;
        }
        String code = candidate.trim().toUpperCase();
        if (!code.matches("^[A-Z]\\d{6,10}$")) {
            log.warn("[AcademicTool] Formato de codigo de estudiante invalido: '{}'", candidate);
            return null;
        }
        try {
            Optional<StudentProfile> persisted = studentRepository.findByStudentCode(code);
            if (persisted.isPresent()) {
                String persistedCode = persisted.get().getStudentCode();
                if (persistedCode != null && !persistedCode.isBlank()) {
                    log.info("[AcademicTool] Identidad respaldada por registro persistido en BD: {}", persistedCode);
                    return persistedCode.trim().toUpperCase();
                }
            }
            log.info("[AcademicTool] No existe registro persistido para el estudiante [{}]", code);
            return null;
        } catch (Exception e) {
            log.warn("[AcademicTool] No se pudo consultar el registro persistido de [{}]: {}", code, e.getMessage());
            return null;
        }
    }


}

