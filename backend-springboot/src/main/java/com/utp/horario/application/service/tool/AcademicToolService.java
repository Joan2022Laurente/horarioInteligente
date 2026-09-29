package com.utp.horario.application.service.tool;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.ClassSession;
import com.utp.horario.domain.model.ScheduleInterval;
import com.utp.horario.domain.model.StudentProfile;
import com.utp.horario.domain.model.Syllabus;
import com.utp.horario.domain.model.tool.AcademicToolDto.*;
import com.utp.horario.domain.port.out.ScheduleRepositoryPort;
import com.utp.horario.domain.port.out.StudentRepositoryPort;
import com.utp.horario.domain.port.out.SyllabusRepositoryPort;
import com.utp.horario.domain.port.out.UtpPortalGatewayPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AcademicToolService {

    private final ScheduleRepositoryPort scheduleRepositoryPort;
    private final SyllabusRepositoryPort syllabusRepositoryPort;
    private final StudentRepositoryPort studentRepositoryPort;
    private final UtpPortalGatewayPort utpPortalGatewayPort;
    private final ObjectMapper objectMapper;

    @Value("${supabase.url:https://hvunobsbasdksiajmfjf.supabase.co}")
    private String supabaseUrl;

    @Value("${supabase.anon-key:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dW5vYnNiYXNka3NpYWptZmpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1Njg0NzAsImV4cCI6MjEwNTE0NDQ3MH0.ZP2J4bJ8V55Y7fggZKfFIzp9p-TxwsRp01UQultfpxc}")
    private String supabaseAnonKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(6))
            .build();

    /**
     * Tool 1: Obtiene las clases del estudiante para una fecha determinada.
     * Soporta fallback automático a Supabase si no se encuentra en el repositorio local.
     */
    public DayScheduleResult getTodaySchedule(String studentCode, String dateIso) {
        // Fijar zona horaria de Perú para evitar inconsistencias en Heroku (que corre en UTC)
        java.time.ZoneId LIMA = java.time.ZoneId.of("America/Lima");
        LocalDate today = (dateIso != null && !dateIso.isBlank())
                ? LocalDate.parse(dateIso)
                : LocalDate.now(LIMA);
        DayOfWeek dayOfWeek = today.getDayOfWeek();
        log.info("[AcademicTool] 📅 Consultando horario de hoy: fecha={}, día={}, studentCode={}", today, dayOfWeek, studentCode);

        List<ClassSessionDto> dayClasses = new ArrayList<>();

        // 1. Intento desde repositorio local H2 / L1 Cache
        Optional<ScheduleInterval> scheduleOpt = scheduleRepositoryPort.findByStudentIdAndPeriod(studentCode, "2026 - Ciclo 2 Agosto");

        // 2. Si no existe en BD local (común en dev), fallback a Supabase REST
        if (scheduleOpt.isEmpty() || scheduleOpt.get().getClasses() == null || scheduleOpt.get().getClasses().isEmpty()) {
            log.info("[AcademicTool] ☁️ Horario local vacío para [{}]. Consultando Supabase 'student_schedules'...", studentCode);
            scheduleOpt = fetchScheduleFromSupabase(studentCode);
        }

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
        // 1. Caché en memoria del gateway (registrado en cada request SSE)
        String token = utpPortalGatewayPort.getStudentToken(studentCode);
        if (token != null && !token.isBlank()) {
            log.debug("[AcademicTool] 🔑 Token resuelto desde caché gateway para [{}] (len={})", studentCode, token.length());
            return token;
        }
        // 2. BD local (H2/Supabase via StudentRepository)
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

        // 2. Fallback: Base de datos local (H2) y Supabase
        Optional<ScheduleInterval> scheduleOpt = scheduleRepositoryPort.findByStudentIdAndPeriod(studentCode, "2026 - Ciclo 2 Agosto");
        if (scheduleOpt.isEmpty()
                || (scheduleOpt.get().getCourses() == null || scheduleOpt.get().getCourses().isEmpty())
                && (scheduleOpt.get().getClasses() == null || scheduleOpt.get().getClasses().isEmpty())) {
            scheduleOpt = fetchScheduleFromSupabase(studentCode);
        }

        List<EnrolledCourseDto> courses = new ArrayList<>();
        if (scheduleOpt.isPresent()) {
            ScheduleInterval schedule = scheduleOpt.get();
            // Prioridad 1: campo courses explícito
            if (schedule.getCourses() != null && !schedule.getCourses().isEmpty()) {
                for (var c : schedule.getCourses()) {
                    courses.add(new EnrolledCourseDto(c.getCode(), c.getName()));
                }
            }
            // Prioridad 2: derivar cursos únicos desde las sesiones (estructura real de Supabase)
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

        // 2. Intentar buscar por código/nombre resuelto en Supabase (PRIORIDAD: código exacto)
        Optional<Syllabus> syllabusOpt = Optional.empty();
        if (resolvedCourseCode != null) {
            syllabusOpt = syllabusRepositoryPort.findByCourseCode(resolvedCourseCode.toUpperCase());
            if (syllabusOpt.isEmpty()) {
                syllabusOpt = fetchSyllabusFromSupabase(resolvedCourseCode);
            }
            if (syllabusOpt.isEmpty() && resolvedCourseName != null) {
                syllabusOpt = fetchSyllabusFromSupabase(resolvedCourseName);
            }
        }

        // 3. Fallback: buscar por query original en BD local y Supabase (sin enrolled courses)
        if (syllabusOpt.isEmpty()) {
            syllabusOpt = syllabusRepositoryPort.findByCourseCode(cleanQuery.toUpperCase());
            if (syllabusOpt.isEmpty()) {
                log.info("[AcademicTool] ☁️ Sílabo no hallado por código; consultando Supabase 'official_syllabi' por query: [{}]", cleanQuery);
                syllabusOpt = fetchSyllabusFromSupabase(cleanQuery);
            }
        }

        String courseCode = syllabusOpt.map(Syllabus::getCourseCode)
                .orElse(resolvedCourseCode != null ? resolvedCourseCode : cleanQuery);

        if (syllabusOpt.isPresent()) {
            log.info("[AcademicTool] 📚 [PASO 2/3 HIT] Sílabo '{}' hallado en Supabase/BD local. Semanas: {}, Evaluaciones: {}",
                    courseCode,
                    syllabusOpt.get().getWeeklySchedule() != null ? syllabusOpt.get().getWeeklySchedule().size() : 0,
                    syllabusOpt.get().getEvaluations() != null ? syllabusOpt.get().getEvaluations().size() : 0);
        } else {
            log.info("[AcademicTool] ❌ [PASO 2/3 MISS] Sílabo '{}' no encontrado en Supabase/BD. Pasando a fallback API Externa...", courseCode);
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
                        persistSyllabusToSupabase(apiSyllabus, codeToTry);
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
            log.warn("[AcademicTool] 🚫 [RESULTADO FINAL] Sílabo NO encontrado para '{}' tras agotar todos los pasos (Supabase + Markdown + fetchSyllabus)", cleanQuery);
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
        String source = syllabusOpt.isPresent() ? "fetchSyllabus/Supabase" : "Markdown-API";
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

        // 2. Fallback: Cálculo local y Supabase a partir de sílabos
        log.info("[AcademicTool] ℹ️ Usando fallback de sílabos para evaluaciones próximas de [{}]...", studentCode);
        List<EvaluationSummaryDto> upcoming = new ArrayList<>();
        EnrolledCoursesResult enrolled = getEnrolledCourses(studentCode);
        List<EnrolledCourseDto> courseList = enrolled.courses();

        for (EnrolledCourseDto course : courseList) {
            String code = course.courseCode();
            Optional<Syllabus> sylOpt = syllabusRepositoryPort.findByCourseCode(code);
            if (sylOpt.isEmpty()) {
                sylOpt = fetchSyllabusFromSupabase(code);
            }

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

    /**
     * Consulta Supabase REST para obtener el horario del estudiante si no está en BD local.
     */
    private Optional<ScheduleInterval> fetchScheduleFromSupabase(String studentCode) {
        try {
            String url = String.format("%s/rest/v1/student_schedules?student_code=eq.%s&select=*",
                    supabaseUrl, java.net.URLEncoder.encode(studentCode, java.nio.charset.StandardCharsets.UTF_8));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("apikey", supabaseAnonKey)
                    .header("Authorization", "Bearer " + supabaseAnonKey)
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(6))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode arrayNode = objectMapper.readTree(response.body());
                if (arrayNode.isArray() && !arrayNode.isEmpty()) {
                    JsonNode row = arrayNode.get(0);
                    JsonNode scheduleDataNode = row.get("schedule_data");
                    if (scheduleDataNode == null || scheduleDataNode.isNull()) {
                        log.warn("[AcademicTool] ⚠️ schedule_data es null en Supabase para [{}]", studentCode);
                        return Optional.empty();
                    }

                    String rawJson = scheduleDataNode.isTextual() ? scheduleDataNode.asText() : scheduleDataNode.toString();
                    JsonNode scheduleJson = objectMapper.readTree(rawJson);

                    // Estructura real de Supabase: { "events": [...], "period_name": "...", "week_number": N }
                    JsonNode eventsNode = scheduleJson.get("events");
                    if (eventsNode == null || !eventsNode.isArray() || eventsNode.isEmpty()) {
                        log.warn("[AcademicTool] ⚠️ No se encontró el campo 'events' en schedule_data para [{}]. Keys: {}", studentCode, scheduleJson.fieldNames());
                        return Optional.empty();
                    }

                    List<ClassSession> sessions = new ArrayList<>();
                    for (JsonNode event : eventsNode) {
                        if (!"SESSION".equals(event.path("type").asText(""))) continue;

                        JsonNode meta = event.path("metadata");
                        ClassSession cs = new ClassSession();
                        // courseCode viene de meta.courseId (ej. "100000ST61") o meta.sectionCode
                        String courseId = meta.path("courseId").asText(null);
                        String sectionCode = meta.path("sectionCode").asText(null);
                        cs.setCourseCode(
                            (courseId != null && !courseId.isBlank()) ? courseId :
                            (sectionCode != null && !sectionCode.isBlank()) ? sectionCode : ""
                        );
                        cs.setCourseName(meta.path("courseName").asText(event.path("title").asText("")));
                        cs.setBuilding(meta.path("building").asText(""));
                        cs.setClassroom(meta.path("classroom").asText(""));
                        cs.setTeacher(meta.path("teacher").asText(""));
                        cs.setFloor(meta.path("floor").asText(null));
                        cs.setEnvironmentType(meta.path("environmentType").asText(null));
                        cs.setZoomLink(meta.path("zoomLink").asText(null));
                        cs.setClassLink(meta.path("classLink").asText(null));
                        cs.setModality(event.path("modality").asText("P"));
                        cs.setStartAt(ClassSession.parseDateTimeSafely(event.path("startAt").asText(null)));
                        cs.setFinishAt(ClassSession.parseDateTimeSafely(event.path("finishAt").asText(null)));
                        sessions.add(cs);
                    }

                    String periodName = scheduleJson.path("period_name").asText("2026 - Ciclo 2 Agosto");
                    Integer weekNumber = scheduleJson.path("week_number").asInt(1);
                    Integer totalWeeks = scheduleJson.path("total_weeks").asInt(18);

                    // Leer también de los campos de nivel raíz de la fila (period_name, week_number, total_weeks)
                    if (periodName.isBlank() || "2026 - Ciclo 2 Agosto".equals(periodName)) {
                        periodName = row.path("period_name").asText("2026 - Ciclo 2 Agosto");
                    }
                    if (weekNumber <= 1) weekNumber = row.path("week_number").asInt(1);
                    if (totalWeeks <= 1) totalWeeks = row.path("total_weeks").asInt(18);

                    ScheduleInterval interval = ScheduleInterval.builder()
                            .periodName(periodName)
                            .weekNumber(weekNumber)
                            .totalWeeks(totalWeeks)
                            .classes(sessions)
                            .build();

                    log.info("[AcademicTool] ☁️ Supabase student_schedules: {} sesiones cargadas para [{}] (período: {})",
                            sessions.size(), studentCode, periodName);
                    return Optional.of(interval);
                }
            } else {
                log.warn("[AcademicTool] ⚠️ Supabase respondió HTTP {} al consultar student_schedules para [{}]", response.statusCode(), studentCode);
            }
        } catch (Exception e) {
            log.warn("[AcademicTool] ℹ️ Error en fallback a Supabase student_schedules para [{}]: {}", studentCode, e.getMessage());
        }
        return Optional.empty();
    }

    /**
     * Consulta Supabase REST para obtener el sílabo por código o nombre aproximado (fuzzy match).
     */
    private Optional<Syllabus> fetchSyllabusFromSupabase(String courseQuery) {
        if (courseQuery == null || courseQuery.isBlank()) {
            return Optional.empty();
        }

        String term = courseQuery.trim();
        String normalized = normalizeTerm(term);

        // 1. Intento con término original o normalizado
        Optional<Syllabus> match = querySupabaseSyllabus(term);
        if (match.isEmpty() && !normalized.equalsIgnoreCase(term)) {
            match = querySupabaseSyllabus(normalized);
        }

        if (match.isPresent()) {
            return match;
        }

        // 2. Si no encuentra resultado directo y contiene varias palabras (ej. "desarrollo web"), buscar por palabra clave principal
        //    Se excluyen stopwords y se requiere mínimo 6 chars para evitar falsos positivos ("para", "con", "los")
        java.util.Set<String> stopWords = java.util.Set.of(
                "para", "con", "los", "las", "del", "que", "una", "uno",
                "sus", "por", "ante", "bajo", "cabe", "como", "desde",
                "entre", "hacia", "hasta", "segun", "sobre", "tras"
        );
        String[] words = normalized.split("\\s+");
        if (words.length > 1) {
            java.util.Arrays.sort(words, (a, b) -> Integer.compare(b.length(), a.length()));
            for (String w : words) {
                if (w.length() >= 6 && !stopWords.contains(w)) {
                    log.info("[AcademicTool] 🔎 Reintentando búsqueda de sílabo por palabra clave: [{}]", w);
                    Optional<Syllabus> keywordMatch = querySupabaseSyllabus(w);
                    if (keywordMatch.isPresent()) {
                        return keywordMatch;
                    }
                }
            }
        }

        return Optional.empty();
    }

    private Optional<Syllabus> querySupabaseSyllabus(String searchTerm) {
        try {
            // URLEncoder usa + para espacios; PostgREST ilike necesita %20
            String encoded = java.net.URLEncoder.encode(searchTerm, java.nio.charset.StandardCharsets.UTF_8)
                    .replace("+", "%20");

            // Si parece un código (alfanumérico sin espacios), intentar eq exacto primero
            String trimmed = searchTerm.trim();
            boolean looksLikeCode = !trimmed.contains(" ") && trimmed.matches("[A-Za-z0-9_\\-\\.]+");
            String url;
            if (looksLikeCode) {
                url = String.format("%s/rest/v1/official_syllabi?or=(course_code.eq.%s,course_code.ilike.*%s*)&select=*&limit=1",
                        supabaseUrl, encoded, encoded);
            } else {
                // Buscar con term original Y normalizado (sin tildes) para mayor cobertura
                String normEncoded = java.net.URLEncoder.encode(normalizeTerm(searchTerm), java.nio.charset.StandardCharsets.UTF_8)
                        .replace("+", "%20");
                url = String.format(
                        "%s/rest/v1/official_syllabi?or=(course_code.ilike.*%s*,course_name.ilike.*%s*,course_name.ilike.*%s*)&select=*&limit=1",
                        supabaseUrl, encoded, encoded, normEncoded);
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("apikey", supabaseAnonKey)
                    .header("Authorization", "Bearer " + supabaseAnonKey)
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(6))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode arrayNode = objectMapper.readTree(response.body());
                if (arrayNode.isArray() && !arrayNode.isEmpty()) {
                    JsonNode row = arrayNode.get(0);
                    Syllabus s = objectMapper.readValue(row.toString(), Syllabus.class);
                    if (s != null) {
                        // Supabase devuelve snake_case: mapear manualmente si Jackson no lo resuelve
                        if ((s.getCourseCode() == null || s.getCourseCode().isBlank()) && row.has("course_code")) {
                            s.setCourseCode(row.get("course_code").asText(null));
                        }
                        if ((s.getCourseName() == null || s.getCourseName().isBlank()) && row.has("course_name")) {
                            s.setCourseName(row.get("course_name").asText(null));
                        }
                        if (s.getCredits() == null && row.has("credits")) {
                            s.setCredits(row.get("credits").asInt(3));
                        }
                        if ((s.getFormula() == null || s.getFormula().isBlank()) && row.has("formula")) {
                            s.setFormula(row.get("formula").asText(null));
                        }
                        if ((s.getLearningGoal() == null || s.getLearningGoal().isBlank()) && row.has("learning_goal")) {
                            s.setLearningGoal(row.get("learning_goal").asText(null));
                        }
                        // Mapear weekly_schedule (snake_case de Supabase)
                        if ((s.getWeeklySchedule() == null || s.getWeeklySchedule().isEmpty()) && row.has("weekly_schedule")) {
                            try {
                                var weeklyType = objectMapper.getTypeFactory()
                                        .constructCollectionType(java.util.List.class, com.utp.horario.domain.model.SyllabusWeeklySession.class);
                                s.setWeeklySchedule(objectMapper.readValue(row.get("weekly_schedule").toString(), weeklyType));
                            } catch (Exception we) {
                                log.warn("[AcademicTool] ℹ️ No se pudo parsear weekly_schedule para [{}]: {}", searchTerm, we.getMessage());
                            }
                        }
                        log.info("[AcademicTool] ✅ Sílabo hallado en Supabase: {} ({}) - {} semanas de temario, para término [{}]",
                                s.getCourseName(), s.getCourseCode(),
                                s.getWeeklySchedule() != null ? s.getWeeklySchedule().size() : 0, searchTerm);
                        return Optional.of(s);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[AcademicTool] ℹ️ Error en consulta a Supabase official_syllabi para [{}]: {}", searchTerm, e.getMessage());
        }
        return Optional.empty();
    }

    private String normalizeTerm(String text) {
        if (text == null) return "";
        String nfd = java.text.Normalizer.normalize(text.trim().toLowerCase(), java.text.Normalizer.Form.NFD);
        return nfd.replaceAll("\\p{InCombiningDiacriticalMarks}+", "").replaceAll("\\s+", " ").trim();
    }

    /**
     * Persiste un sílabo obtenido de la API Externa en Supabase official_syllabi (upsert).
     * Esto permite que futuros llamados al copiloto eviten llamar a la API Externa.
     */
    private void persistSyllabusToSupabase(Syllabus syllabus, String courseCode) {
        try {
            if (syllabus == null || courseCode == null || courseCode.isBlank()) return;
            String code = syllabus.getCourseCode() != null && !syllabus.getCourseCode().isBlank()
                    ? syllabus.getCourseCode() : courseCode;
            String name = syllabus.getCourseName() != null ? syllabus.getCourseName() : courseCode;

            java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
            body.put("course_id", code);
            body.put("course_code", code);
            body.put("course_name", name.toUpperCase());
            if (syllabus.getCredits() != null) body.put("credits", syllabus.getCredits());
            if (syllabus.getFormula() != null) body.put("formula", syllabus.getFormula());
            if (syllabus.getLearningGoal() != null) body.put("learning_goal", syllabus.getLearningGoal());
            if (syllabus.getWeeklySchedule() != null && !syllabus.getWeeklySchedule().isEmpty()) {
                body.put("weekly_schedule", syllabus.getWeeklySchedule());
            }
            if (syllabus.getEvaluations() != null && !syllabus.getEvaluations().isEmpty()) {
                body.put("evaluations", syllabus.getEvaluations());
            }

            String json = objectMapper.writeValueAsString(body);
            String url = supabaseUrl + "/rest/v1/official_syllabi?on_conflict=course_id";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("apikey", supabaseAnonKey)
                    .header("Authorization", "Bearer " + supabaseAnonKey)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "resolution=merge-duplicates")
                    .timeout(Duration.ofSeconds(8))
                    .POST(HttpRequest.BodyPublishers.ofString(json, java.nio.charset.StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("[AcademicTool] 💾 Sílabo [{}] ({}) persistido en Supabase official_syllabi", code, name);
            } else {
                log.warn("[AcademicTool] ⚠️ Error al persistir sílabo en Supabase: HTTP {} - {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("[AcademicTool] ℹ️ No se pudo persistir el sílabo en Supabase: {}", e.getMessage());
        }
    }
}

