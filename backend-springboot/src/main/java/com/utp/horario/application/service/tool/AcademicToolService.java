package com.utp.horario.application.service.tool;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.value_objects.ClassSession;
import com.utp.horario.domain.model.value_objects.Course;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.application.dtos.AcademicToolDto.*;
import com.utp.horario.domain.model.value_objects.CourseSummaryDto;
import com.utp.horario.domain.model.value_objects.UpcomingEvaluationDto;
import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.repositories.IStudentRepository;
import com.utp.horario.domain.model.repositories.ISyllabusRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.infrastructure.security.CurrentRequestToken;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

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

    @org.springframework.beans.factory.annotation.Value("${app.academic.current-period:" + DEFAULT_PERIOD_NAME + "}")
    private String currentPeriodName = DEFAULT_PERIOD_NAME;

    public String getCurrentPeriod() {
        return (currentPeriodName != null && !currentPeriodName.isBlank()) ? currentPeriodName : DEFAULT_PERIOD_NAME;
    }

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

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.utp.horario.domain.model.repositories.ITaskSyncRepository taskRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.utp.horario.application.service.TaskQueryService taskQueryService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private CurrentRequestToken currentRequestToken;

    public void setTaskRepository(com.utp.horario.domain.model.repositories.ITaskSyncRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public void setTaskQueryService(com.utp.horario.application.service.TaskQueryService taskQueryService) {
        this.taskQueryService = taskQueryService;
    }



    public String resolveEffectiveStudentCode(String studentCode) {
        if (studentCode != null && !studentCode.isBlank() && !"current-student".equalsIgnoreCase(studentCode)) {
            return studentCode.trim().toUpperCase();
        }
        return null;
    }

    public String resolveDayOfWeekSpanish(LocalDate date) {
        if (date == null) return null;
        return switch (date.getDayOfWeek()) {
            case MONDAY -> "Lunes";
            case TUESDAY -> "Martes";
            case WEDNESDAY -> "Miércoles";
            case THURSDAY -> "Jueves";
            case FRIDAY -> "Viernes";
            case SATURDAY -> "Sábado";
            case SUNDAY -> "Domingo";
        };
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
        Optional<ScheduleInterval> scheduleOpt = scheduleRepository.findByStudentIdAndPeriod(studentCode, getCurrentPeriod());

        if (scheduleOpt.isEmpty() || scheduleOpt.get().getClasses() == null) {
            // Guardia de honestidad: sin horario persistido NO es "día libre"; es falta de datos.
            log.warn("[AcademicTool] 🚫 Sin horario persistido para [{}] — se declara la ausencia", studentCode);
            return new DayScheduleResult(studentCode, today.toString(), 0, List.of(),
                    "No tienes un horario registrado en el sistema. Por favor sincroniza tu sesión institucional.", null);
        }

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
                String startTimeStr = c.getStartAt() != null ? c.getStartAt().format(DateTimeFormatter.ofPattern("HH:mm")) : null;
                String endTimeStr = c.getFinishAt() != null ? c.getFinishAt().format(DateTimeFormatter.ofPattern("HH:mm")) : null;

                dayClasses.add(new ClassSessionDto(
                        c.getCourseCode(),
                        c.getCourseName(),
                        startTimeStr,
                        endTimeStr,
                        (c.getBuilding() != null && !c.getBuilding().isBlank()) ? c.getBuilding() : null,
                        (c.getClassroom() != null && !c.getClassroom().isBlank()) ? c.getClassroom() : null,
                        (c.getTeacher() != null && !c.getTeacher().isBlank()) ? c.getTeacher() : null
                ));
            }
        }

        log.info("[AcademicTool] 🔎 Clases encontradas para hoy ({}): {}", dayOfWeek, dayClasses.size());

        String message = dayClasses.isEmpty()
                ? "Hoy no tienes clases programadas en tu horario oficial. ¡Día libre!"
                : null;

        String dayOfWeekSpanish = resolveDayOfWeekSpanish(today);
        return new DayScheduleResult(studentCode, today.toString(), dayOfWeekSpanish, dayClasses.size(), dayClasses, message, weekNumber);
    }

    /**
     * Tool 5 (Determinista): Obtiene las clases que quedan por cursar en el día (o en curso),
     * enriquecidas deterministamente en el servidor con el temario oficial del sílabo
     * para la semana lectiva actual, actividades previstas y evaluaciones programadas.
     *
     * @param studentCode código institucional del estudiante
     * @param dateStr fecha ISO YYYY-MM-DD opcional (por defecto hoy en America/Lima)
     * @param timeStr hora HH:mm opcional (por defecto la hora actual en America/Lima)
     * @return resultado enriquecido con clases restantes y temas de sílabo
     */
    public RemainingClassesTodayResult getRemainingClassesToday(String studentCode, String dateStr, String timeStr) {
        studentCode = resolveEffectiveStudentCode(studentCode);

        LocalDate date = LocalDate.now(LIMA_ZONE);
        if (dateStr != null && !dateStr.isBlank()) {
            try {
                date = LocalDate.parse(dateStr.trim());
            } catch (DateTimeParseException e) {
                log.warn("[AcademicTool] Fecha inválida en getRemainingClassesToday [{}], usando hoy", dateStr);
            }
        }

        LocalTime time = LocalTime.now(LIMA_ZONE);
        if (timeStr != null && !timeStr.isBlank()) {
            try {
                time = LocalTime.parse(timeStr.trim());
            } catch (DateTimeParseException e) {
                log.warn("[AcademicTool] Hora inválida en getRemainingClassesToday [{}], usando hora actual", timeStr);
            }
        }

        String currentTimeFormatted = time.format(DateTimeFormatter.ofPattern("HH:mm"));
        String dayOfWeekSpanish = resolveDayOfWeekSpanish(date);

        if (studentCode == null || studentCode.isBlank()) {
            return new RemainingClassesTodayResult("", date.toString(), dayOfWeekSpanish, currentTimeFormatted, null, 0, List.of(),
                    "No se identificó una sesión de estudiante activa. Inicia sesión para consultar tu horario personal.");
        }

        Optional<ScheduleInterval> scheduleOpt = scheduleRepository.findByStudentIdAndPeriod(studentCode, getCurrentPeriod());
        if (scheduleOpt.isEmpty() || scheduleOpt.get().getClasses() == null) {
            log.warn("[AcademicTool] 🚫 Sin horario persistido para [{}] en getRemainingClassesToday", studentCode);
            return new RemainingClassesTodayResult(studentCode, date.toString(), dayOfWeekSpanish, currentTimeFormatted, null, 0, List.of(),
                    "No tienes un horario registrado en el sistema. Por favor sincroniza tu sesión institucional.");
        }

        ScheduleInterval schedule = scheduleOpt.get();
        Integer currentWeek = schedule.getWeekNumber();

        List<ClassSession> allClassesToday = new ArrayList<>();
        for (ClassSession c : schedule.getClasses()) {
            if (c.getStartAt() != null && c.getStartAt().toLocalDate().equals(date)) {
                allClassesToday.add(c);
            }
        }

        if (allClassesToday.isEmpty()) {
            return new RemainingClassesTodayResult(studentCode, date.toString(), dayOfWeekSpanish, currentTimeFormatted, currentWeek, 0, List.of(),
                    "Hoy no tienes clases programadas en tu horario oficial. ¡Día libre!");
        }

        List<RemainingClassSessionDto> remaining = new ArrayList<>();

        for (ClassSession c : allClassesToday) {
            LocalTime startTime = c.getStartAt() != null ? c.getStartAt().toLocalTime() : null;
            if (startTime == null) continue;
            LocalTime finishTime = c.getFinishAt() != null ? c.getFinishAt().toLocalTime() : null;

            // Si la clase ya concluyó antes de la hora actual, se descarta deterministamente
            if (finishTime != null && finishTime.isBefore(time)) {
                continue;
            }

            String status;
            long minutesUntilStart;
            if (finishTime != null && !time.isBefore(startTime) && !time.isAfter(finishTime)) {
                status = "EN_CURSO";
                minutesUntilStart = 0L;
            } else {
                status = "PROXIMA";
                minutesUntilStart = Math.max(0L, Duration.between(time, startTime).toMinutes());
            }

            String startTimeStr = startTime.format(DateTimeFormatter.ofPattern("HH:mm"));
            String finishTimeStr = finishTime != null ? finishTime.format(DateTimeFormatter.ofPattern("HH:mm")) : null;
            String timeWindow = finishTimeStr != null ? startTimeStr + " - " + finishTimeStr : startTimeStr + " (sin hora fin)";

            String courseCode = c.getCourseCode() != null ? c.getCourseCode().trim() : "";
            String courseName = c.getCourseName() != null ? c.getCourseName().trim() : null;

            // Enriquecimiento determinista con el sílabo oficial
            String syllabusTopic = null;
            String syllabusActivities = null;
            String evaluationScheduled = null;

            if (!courseCode.isBlank()) {
                Optional<Syllabus> syllabusOpt = syllabusRepository.findByCourseCode(courseCode.toUpperCase());
                if (syllabusOpt.isPresent()) {
                    Syllabus syl = syllabusOpt.get();
                    if (currentWeek != null && syl.getWeeklySchedule() != null) {
                        for (var ws : syl.getWeeklySchedule()) {
                            if (ws.getWeek() != null && ws.getWeek().equals(currentWeek)) {
                                syllabusTopic = ws.getTopic();
                                syllabusActivities = ws.getActivities();
                                if (ws.getEvaluation() != null && !ws.getEvaluation().isBlank()) {
                                    evaluationScheduled = ws.getEvaluation();
                                }
                                break;
                            }
                        }
                    }

                    if (evaluationScheduled == null && currentWeek != null && syl.getEvaluations() != null) {
                        for (var ev : syl.getEvaluations()) {
                            if (ev.getWeek() != null && ev.getWeek().equals(currentWeek)) {
                                evaluationScheduled = ev.getType() + " (" + ev.getWeightPercent() + "%) - " + ev.getDescription();
                                break;
                            }
                        }
                    }
                }
            }

            String modality = "P".equalsIgnoreCase(c.getModality()) ? "Presencial"
                    : ("R".equalsIgnoreCase(c.getModality()) ? "Remota en Vivo" : "Virtual Asíncrono");

            remaining.add(new RemainingClassSessionDto(
                    courseCode,
                    courseName,
                    status,
                    timeWindow,
                    startTimeStr,
                    finishTimeStr,
                    minutesUntilStart,
                    modality,
                    (c.getClassroom() != null && !c.getClassroom().isBlank()) ? c.getClassroom() : null,
                    (c.getBuilding() != null && !c.getBuilding().isBlank()) ? c.getBuilding() : null,
                    (c.getFloor() != null && !c.getFloor().isBlank()) ? c.getFloor() : null,
                    (c.getTeacher() != null && !c.getTeacher().isBlank()) ? c.getTeacher() : null,
                    c.getZoomLink(),
                    syllabusTopic,
                    syllabusActivities,
                    evaluationScheduled
            ));
        }

        // Ordenar cronológicamente por hora de inicio
        remaining.sort(Comparator.comparing(RemainingClassSessionDto::startTime));

        String message = null;
        if (remaining.isEmpty()) {
            message = "Todas tus clases programadas para hoy ya concluyeron. ¡Jornada académica finalizada!";
        }

        log.info("[AcademicTool] 🕒 getRemainingClassesToday [{}]: {} clases restantes de {} totales en fecha {} a las {}",
                studentCode, remaining.size(), allClassesToday.size(), date, currentTimeFormatted);

        return new RemainingClassesTodayResult(
                studentCode,
                date.toString(),
                dayOfWeekSpanish,
                currentTimeFormatted,
                currentWeek,
                remaining.size(),
                remaining,
                message
        );
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
        return scheduleRepository.findByStudentIdAndPeriod(code, getCurrentPeriod())
                .map(ScheduleInterval::getWeekNumber)
                .orElse(null);
    }

    /**
     * Pre-Flight Guard (Fase 0.7.1): indica si el estudiante tiene datos académicos reales
     * en su snapshot persistido del periodo lectivo vigente (clases o cursos; un intervalo
     * honestamente vacío cuenta como ausencia de datos). Es una consulta de lectura barata
     * que permite al orquestador responder localmente con costo $0.00 en lugar de gastar
     * llamadas de inferencia para que el LLM concluya que no hay nada que analizar.
     *
     * @param studentCode código institucional del estudiante
     * @return {@code true} si existe horario persistido con clases o cursos declarados
     */
    public boolean hasPersistedSchedule(String studentCode) {
        String code = resolveEffectiveStudentCode(studentCode);
        if (code == null || code.isBlank()) {
            return false;
        }
        return scheduleRepository.findByStudentIdAndPeriod(code, getCurrentPeriod())
                .map(this::intervalHasAcademicData)
                .orElse(false);
    }

    /** Criterio de datos reales: al menos una clase o un curso declarado en el intervalo. */
    private boolean intervalHasAcademicData(ScheduleInterval schedule) {
        boolean hasClasses = schedule.getClasses() != null && !schedule.getClasses().isEmpty();
        boolean hasCourses = schedule.getCourses() != null && !schedule.getCourses().isEmpty();
        return hasClasses || hasCourses;
    }

    private String resolveStudentToken(String studentCode) {
        studentCode = resolveEffectiveStudentCode(studentCode);
        // 1. Token del propio request HTTP (stateless, sin registro por alumno).
        String token = currentRequestToken != null ? currentRequestToken.bearerToken() : null;
        if (token != null && !token.isBlank()) {
            log.debug("[AcademicTool] Token resuelto desde la cabecera de la request para [{}]", studentCode);
            return token;
        }
        // 2. BD MySQL (via StudentRepository), solo para contextos sin request HTTP
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
        Exception gatewayException = null;
        if (token != null && !token.isBlank()) {
            try {
                List<CourseSummaryDto> summaries = utpPortalGateway.fetchCoursesSummary(token);
                if (summaries != null && !summaries.isEmpty()) {
                    ScheduleInterval persistedSchedule = scheduleRepository
                            .findByStudentIdAndPeriod(studentCode, getCurrentPeriod()).orElse(null);
                    List<EnrolledCourseDto> courses = summaries.stream()
                            .map(s -> {
                                String name = trimToNull(s.courseName());
                                String code = resolveOfficialCode(persistedSchedule, name, s.courseCode());
                                return new EnrolledCourseDto(code != null ? code : "", s.courseName());
                            })
                            .distinct()
                            .toList();
                    log.info("[AcademicTool] 🏛️ {} cursos oficiales obtenidos desde API Externa Gateway para [{}]", courses.size(), studentCode);
                    return new EnrolledCoursesResult(studentCode, courses.size(), courses);
                }
            } catch (Exception e) {
                log.warn("[AcademicTool] ⚠️ Error consultando API Externa /courses/summary para [{}]: {}", studentCode, e.getMessage());
                gatewayException = e;
            }
        }

        // 2. Base de datos (MySQL / Caché local)
        Optional<ScheduleInterval> scheduleOpt = scheduleRepository.findByStudentIdAndPeriod(studentCode, getCurrentPeriod());
        List<EnrolledCourseDto> courses = scheduleOpt
                .map(this::resolveCoursesFromPersistedSchedule)
                .orElseGet(List::of);
        log.info("[AcademicTool] 📚 Cursos matriculados encontrados (fallback): {}", courses.size());
        if (courses.isEmpty()) {
            if (gatewayException != null) {
                throw new IllegalStateException("Error consultando cursos oficiales en la pasarela UTP: " + gatewayException.getMessage(), gatewayException);
            }
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
                    null,
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
                    null,
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

        final boolean hasMarkdown = markdown != null && !markdown.isBlank();
        Syllabus s = syllabusOpt.orElseGet(() -> {
            // Regla de honestidad de datos: si solo hay markdown oficial sin franja de
            // créditos o meta, los campos quedan null; nunca se inflan con cadenas inventadas.
            Syllabus fallback = new Syllabus();
            fallback.setCourseCode(courseCode);
            fallback.setCourseName(cleanQuery.toUpperCase());
            fallback.setFormula("");
            fallback.setLearningGoal(hasMarkdown ? "Obtenido directamente desde el Sílabo Oficial UTP" : null);
            return fallback;
        });

        List<EvaluationSummaryDto> evals = s.getEvaluations() != null ? s.getEvaluations().stream()
                .map(e -> new EvaluationSummaryDto(
                        s.getCourseCode(),
                        s.getCourseName(),
                        e.getType(),
                        e.getDescription(),
                        e.getWeightPercent(),
                        e.getWeek()
                )).toList() : List.of();

        List<WeeklySessionDto> weekly = s.getWeeklySchedule() != null ? s.getWeeklySchedule().stream()
                .map(w -> new WeeklySessionDto(
                        w.getWeek(),
                        w.getUnit(),
                        w.getTopic(),
                        w.getActivities(),
                        w.getEvaluation()
                )).toList() : List.of();

        return applyWeekFilter(new SyllabusDetailsResult(
                s.getCourseCode(),
                s.getCourseName(),
                s.getCredits(),
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
        Exception gatewayException = null;
        if (token != null && !token.isBlank()) {
            try {
                List<UpcomingEvaluationDto> externalUpcoming = utpPortalGateway.fetchUpcomingEvaluations(token, 5);
                if (externalUpcoming != null && !externalUpcoming.isEmpty()) {
                    List<EvaluationSummaryDto> mapped = new ArrayList<>();
                    for (UpcomingEvaluationDto u : externalUpcoming) {
                        String code = (u.courseId() != null && !u.courseId().isBlank()) ? u.courseId() : "";
                        String type = (u.evaluationSystem() != null && !u.evaluationSystem().isBlank()) 
                                ? u.evaluationSystem() 
                                : u.activityType();
                        
                        String urgencyNote = (u.urgency() != null && !u.urgency().isBlank()) ? " (" + u.urgency() + ")" : "";
                        String desc = (u.title() != null) ? u.title() + urgencyNote : null;
                        
                        Integer evaluationWeek = u.weekNumber() > 0 ? u.weekNumber() : null;
                        
                        mapped.add(new EvaluationSummaryDto(
                                code,
                                u.courseName(),
                                type,
                                desc,
                                null,
                                evaluationWeek
                        ));
                    }
                    log.info("[AcademicTool] 🏛️ {} evaluaciones próximas obtenidas de API Externa Gateway para [{}]", mapped.size(), studentCode);
                    return mapped;
                }
            } catch (Exception e) {
                log.warn("[AcademicTool] ⚠️ Error consultando API Externa /tasks/upcoming para [{}]: {}", studentCode, e.getMessage());
                gatewayException = e;
            }
        }

        // 2. Fallback: Cálculo local y MySQL a partir de sílabos
        log.info("[AcademicTool] ℹ️ Usando fallback de sílabos para evaluaciones próximas de [{}]...", studentCode);
        List<EvaluationSummaryDto> upcoming = new ArrayList<>();
        EnrolledCoursesResult enrolled = getEnrolledCourses(studentCode);
        List<EnrolledCourseDto> courseList = enrolled.courses();

        for (EnrolledCourseDto course : courseList) {
            String code = trimToNull(course.courseCode());
            String name = trimToNull(course.courseName());
            Optional<Syllabus> sylOpt = isOfficialCatalogCode(code)
                    ? syllabusRepository.findByCourseCode(code)
                    : Optional.empty();

            if (sylOpt.isEmpty() && name != null) {
                sylOpt = syllabusRepository.findByCourseName(name);
            }

            if (sylOpt.isEmpty()) {
                log.warn("[AcademicTool] ⚠️ Sin sílabo persistido para '{}' (cod='{}'); curso omitido sin inventar evaluaciones",
                        course.courseName(), course.courseCode());
                continue;
            }

            Syllabus syllabus = sylOpt.get();
            String officialCode = sylOpt.map(Syllabus::getCourseCode)
                    .map(AcademicToolService::trimToNull)
                    .orElse(code != null ? code : "");

            if (syllabus.getEvaluations() != null) {
                syllabus.getEvaluations().stream()
                        .filter(e -> e.getWeek() != null && e.getWeek() >= week && e.getWeek() <= week + 3)
                        .forEach(e -> upcoming.add(new EvaluationSummaryDto(
                                officialCode,
                                course.courseName(),
                                e.getType(),
                                e.getDescription(),
                                e.getWeightPercent(),
                                e.getWeek()
                        )));
            }
        }
        if (upcoming.isEmpty() && courseList.isEmpty() && gatewayException != null) {
            throw new IllegalStateException("Error consultando evaluaciones próximas en la pasarela UTP: " + gatewayException.getMessage(), gatewayException);
        }
        log.info("[AcademicTool] 🎯 Evaluaciones próximas encontradas en fallback: {}", upcoming.size());
        return upcoming;
    }

    /**
     * Tool 6: Obtiene las tareas, actividades y entregables de un curso específico del estudiante,
     * cruzándolos con la semana lectiva actual y los rubros de evaluación del sílabo (ej. Nota de Participación 'PA').
     *
     * @param studentCode    código del estudiante
     * @param courseQuery    nombre o código del curso a consultar
     * @return resultado estructurado para el agente y MCP
     */
    public CourseTasksAndActivitiesResult getCourseTasksAndActivities(String studentCode, String courseQuery) {
        return getCourseTasksAndActivities(studentCode, courseQuery, null, null);
    }

    public CourseTasksAndActivitiesResult getCourseTasksAndActivities(String studentCode, String courseQuery,
                                                                      String evaluationType, String statusFilter) {
        String code = resolveEffectiveStudentCode(studentCode);
        String cleanQuery = (courseQuery != null) ? courseQuery.trim() : "";

        if (code == null || code.isBlank()) {
            return new CourseTasksAndActivitiesResult(
                    "", cleanQuery, "Curso no especificado", null, "",
                    false, null, 0, 0, 0, 0, List.of(), List.of(),
                    "No se identificó una sesión de estudiante activa. Inicia sesión para consultar tus tareas."
            );
        }

        if (cleanQuery.isBlank()) {
            return new CourseTasksAndActivitiesResult(
                    code, "", "Curso no especificado", null, "",
                    false, null, 0, 0, 0, 0, List.of(), List.of(),
                    "Argumento obligatorio 'course_query' ausente: envía el nombre o código del curso."
            );
        }

        // 1. Resolver curso desde asignaturas matriculadas del estudiante
        String resolvedCourseCode = null;
        String resolvedCourseName = null;
        try {
            EnrolledCoursesResult enrolled = getEnrolledCourses(code);
            if (enrolled != null && enrolled.courses() != null) {
                String normQuery = normalizeTerm(cleanQuery);
                for (var ec : enrolled.courses()) {
                    String normEcName = normalizeTerm(ec.courseName());
                    String normEcCode = normalizeTerm(ec.courseCode());
                    if (normEcName.contains(normQuery) || normQuery.contains(normEcName)
                            || normEcCode.equalsIgnoreCase(normQuery)) {
                        resolvedCourseCode = ec.courseCode();
                        resolvedCourseName = ec.courseName();
                        log.info("[AcademicTool] 🎯 Curso resuelto para tareas: {} ({})", resolvedCourseName, resolvedCourseCode);
                        break;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[AcademicTool] Error resolviendo curso matriculado para tareas: {}", e.getMessage());
        }

        String targetCourseCode = (resolvedCourseCode != null) ? resolvedCourseCode : cleanQuery;
        String targetCourseName = (resolvedCourseName != null) ? resolvedCourseName : cleanQuery;

        // 1b. sectionId oficial de la sección asignada al estudiante, resuelto del horario persistido.
        String resolvedSectionId = resolveSectionIdForCourse(code, targetCourseCode, targetCourseName);

        // 2. Resolver Sílabo del curso (para fórmula, evaluaciones y rúbricas)
        Optional<Syllabus> syllabusOpt = Optional.empty();
        if (resolvedCourseCode != null) {
            syllabusOpt = syllabusRepository.findByCourseCode(resolvedCourseCode.toUpperCase());
        }
        if (syllabusOpt.isEmpty() && !cleanQuery.isBlank()) {
            syllabusOpt = syllabusRepository.findByCourseCode(cleanQuery.toUpperCase());
        }

        String gradingFormula = syllabusOpt.map(Syllabus::getFormula).orElse("");
        boolean hasParticipation = false;
        Integer participationWeight = null;
        List<com.utp.horario.domain.model.value_objects.SyllabusEvaluation> syllabusEvals = syllabusOpt
                .map(Syllabus::getEvaluations)
                .orElse(List.of());

        for (var ev : syllabusEvals) {
            String type = ev.getType() != null ? ev.getType().trim().toUpperCase() : "";
            String desc = ev.getDescription() != null ? ev.getDescription().toLowerCase() : "";
            if (type.equals("PA") || desc.contains("participaci") || desc.contains("continua")) {
                hasParticipation = true;
                participationWeight = ev.getWeightPercent();
                break;
            }
        }

        // 3. Resolver semana lectiva vigente (ancla temporal)
        Integer currentWeek = resolveCurrentWeek(code);

        // 4. Recuperar tareas del estudiante (Fail Fast: fallos de infraestructura se propagan)
        List<com.utp.horario.domain.model.aggregate.TaskSyncItem> rawTasks = new ArrayList<>();
        Exception taskInfraException = null;

        if (taskRepository != null) {
            try {
                List<com.utp.horario.domain.model.aggregate.TaskSyncItem> local = taskRepository.findByStudentId(code);
                if (local != null) rawTasks.addAll(local);
            } catch (Exception ex) {
                log.error("[AcademicTool] ❌ Error de infraestructura en taskRepository para [{}]: {}", code, ex.getMessage(), ex);
                taskInfraException = ex;
            }
        }

        if (rawTasks.isEmpty() && taskQueryService != null && taskInfraException == null) {
            try {
                String token = resolveStudentToken(code);
                // intervalMode="period" consulta el historial completo del ciclo (semanas 1-18).
                // NO usar getTasksWithPortalFallback: /tasks/upcoming solo entrega tareas vigentes/futuras
                // y descarta deliberadamente las semanas vencidas (causa del historial truncado).
                List<com.utp.horario.domain.model.aggregate.TaskSyncItem> periodActivities =
                        taskQueryService.getActivities(code, token, "period", null, null, null, null);
                if (periodActivities != null) rawTasks.addAll(periodActivities);
            } catch (Exception ex) {
                log.error("[AcademicTool] ❌ Error de infraestructura consultando el historial de tareas de [{}]: {}", code, ex.getMessage(), ex);
                taskInfraException = ex;
            }
        }

        if (taskInfraException != null && rawTasks.isEmpty()) {
            throw new IllegalStateException("Error de infraestructura al consultar repositorio de tareas para "
                    + code + ": " + taskInfraException.getMessage(), taskInfraException);
        }

        // 4b. Enriquecimiento con el ÁRBOL CANÓNICO del aula virtual (todas las semanas).
        // El calendario personal solo contiene alertas; aquí se incorporan las actividades reales.
        List<com.utp.horario.domain.model.aggregate.TaskSyncItem> collectedTasks = new ArrayList<>(rawTasks);
        if (resolvedSectionId != null && taskInfraException == null) {
            String sectionToken = resolveStudentToken(code);
            if (sectionToken != null && !sectionToken.isBlank()) {
                try {
                    List<com.utp.horario.domain.model.aggregate.TaskSyncItem> sectionActivities =
                            utpPortalGateway.fetchSectionActivities(
                                    sectionToken, resolvedSectionId, targetCourseCode, targetCourseName);
                    if (sectionActivities != null && !sectionActivities.isEmpty()) {
                        collectedTasks = mergeTasks(collectedTasks, sectionActivities);
                    }
                    log.info("[AcademicTool] 🌳 Árbol de la sección [{}]: {} actividad(es) evaluativas",
                            resolvedSectionId, sectionActivities == null ? 0 : sectionActivities.size());
                } catch (Exception ex) {
                    // Degradación transparente: se conservan calendario/Read Model, sin inventar tareas.
                    log.warn("[AcademicTool] No se pudo enriquecer desde el árbol de la sección [{}]: {} "
                            + "— se usan solo los registros ya disponibles", resolvedSectionId, ex.getMessage());
                }
            } else {
                log.warn("[AcademicTool] Sin token institucional; se omite el árbol de la sección [{}]", resolvedSectionId);
            }
        }
        final List<com.utp.horario.domain.model.aggregate.TaskSyncItem> allTasks = collectedTasks;

        // 5. Filtrar tareas para este curso específico
        String normTargetName = normalizeTerm(targetCourseName);
        String normTargetCode = normalizeTerm(targetCourseCode);

        List<com.utp.horario.domain.model.aggregate.TaskSyncItem> courseTasks = allTasks.stream().filter(t -> {
            if (t.getCourseCode() != null && normTargetCode.equalsIgnoreCase(normalizeTerm(t.getCourseCode()))) {
                return true;
            }
            if (t.getCourseName() != null) {
                String normTaskCourse = normalizeTerm(t.getCourseName());
                return normTaskCourse.contains(normTargetName) || normTargetName.contains(normTaskCourse);
            }
            return false;
        }).toList();

        if (courseTasks.isEmpty()) {
            String emptyMsg = "No se encontraron tareas registradas para el curso '" + targetCourseName
                    + "' en tu cuenta institucional. Puedes sincronizar tus tareas en la sección de Tareas.";
            return new CourseTasksAndActivitiesResult(
                    code, targetCourseCode, targetCourseName, currentWeek, gradingFormula,
                    hasParticipation, participationWeight, 0, 0, 0, 0,
                    List.of(), List.of(), emptyMsg
            );
        }

        // 6. Procesar y clasificar cada tarea
        List<CourseTaskDto> mappedTasks = new ArrayList<>();
        int deliveredCount = 0;
        int pendingCount = 0;
        int pastDueUnsubmittedCount = 0;

        String normEvalFilter = (evaluationType != null && !evaluationType.isBlank() && !"TODAS".equalsIgnoreCase(evaluationType))
                ? evaluationType.trim().toUpperCase() : null;
        String normStatusFilter = (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter))
                ? statusFilter.trim().toUpperCase() : null;

        for (var t : courseTasks) {
            boolean isDelivered = Boolean.TRUE.equals(t.getIsDelivered())
                    || "DELIVERED".equalsIgnoreCase(t.getHomeworkStatus())
                    || "GRADED".equalsIgnoreCase(t.getHomeworkStatus())
                    || "FINISHED".equalsIgnoreCase(t.getAssignmentProgress());

            // Resolver timing status relativo a la semana actual
            String timingStatus;
            Integer taskWeek = t.getWeek();
            if (taskWeek != null && currentWeek != null) {
                if (taskWeek < currentWeek) {
                    timingStatus = isDelivered ? "ENTREGADA_A_TIEMPO" : "PASADA_NO_ENTREGADA";
                } else if (taskWeek.equals(currentWeek)) {
                    timingStatus = isDelivered ? "SEMANA_ACTUAL_ENTREGADA" : "SEMANA_ACTUAL_PENDIENTE";
                } else {
                    timingStatus = "FUTURA_PROGRAMADA";
                }
            } else {
                timingStatus = isDelivered ? "ENTREGADA" : "PENDIENTE";
            }

            if (isDelivered) {
                deliveredCount++;
            } else {
                pendingCount++;
                if ("PASADA_NO_ENTREGADA".equals(timingStatus)) {
                    pastDueUnsubmittedCount++;
                }
            }

            // Resolver asociación al rubro: 1) correlación oficial de la tarea, 2) sistema de
            // evaluación del portal, 3) cruce con las evaluaciones del SÍLABO OFICIAL ya cargado.
            // El tercer nivel usa denominaciones institucionales reales, nunca títulos inventados.
            String evalType = "SIN_RUBRO_OFICIAL";
            String evalDesc = "Actividad sin rubro de evaluación oficial vinculado";

            if (t.getSyllabusCorrelation() != null && t.getSyllabusCorrelation().getEvaluationType() != null
                    && !t.getSyllabusCorrelation().getEvaluationType().isBlank()) {
                evalType = t.getSyllabusCorrelation().getEvaluationType().trim().toUpperCase();
                evalDesc = (t.getSyllabusCorrelation().getEvaluationDescription() != null && !t.getSyllabusCorrelation().getEvaluationDescription().isBlank())
                        ? t.getSyllabusCorrelation().getEvaluationDescription() : "Evaluación del sílabo: " + evalType;
            } else {
                String institutionalSystem = trimToNull(t.getEvaluationSystem());
                if (institutionalSystem != null) {
                    evalType = institutionalSystem.toUpperCase();
                    evalDesc = "Sistema de evaluación institucional: " + evalType;
                }
            }

            // Si evalType no es ya un código oficial del sílabo (ej. "PC1", "PA", "PROY"), se normaliza
            // contrastando contra las evaluaciones oficiales del sílabo:
            // 1) Por el código o descripción institucional actual (ej. "PRÁCTICA CALIFICADA 1" -> "PC1")
            // 2) Por el sistema de evaluación institucional de la sección
            // 3) Por el título de la actividad
            if (!isOfficialRubroType(syllabusEvals, evalType)) {
                RubroMatch match = resolveRubroFromSyllabus(evalType, syllabusEvals);
                if (match == null && t.getEvaluationSystem() != null) {
                    match = resolveRubroFromSyllabus(t.getEvaluationSystem(), syllabusEvals);
                }
                if (match == null) {
                    match = resolveRubroFromSyllabus(t.getTitle(), syllabusEvals);
                }
                if (match != null) {
                    evalType = match.type();
                    evalDesc = match.description();
                }
            }

            // Aplicar filtros opcionales solicitados por el modelo/usuario
            if (normEvalFilter != null && !evalType.contains(normEvalFilter) && !normEvalFilter.contains(evalType)) {
                continue;
            }
            if (normStatusFilter != null) {
                if ("DELIVERED".equals(normStatusFilter) && !isDelivered) continue;
                if ("PENDING".equals(normStatusFilter) && isDelivered) continue;
            }

            String dueDateStr = t.getDueDate() != null ? t.getDueDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")) : null;

            mappedTasks.add(new CourseTaskDto(
                    t.getId(),
                    t.getTitle() != null ? t.getTitle() : "Actividad académica",
                    taskWeek,
                    dueDateStr,
                    t.getHomeworkStatus() != null ? t.getHomeworkStatus() : (isDelivered ? "DELIVERED" : "PENDING"),
                    isDelivered,
                    Boolean.TRUE.equals(t.getIsQualified()),
                    t.getScore(),
                    t.getMaxScore(),
                    evalType,
                    evalDesc,
                    timingStatus
            ));
        }

        // 7. Agrupar tareas por rubro de evaluación
        java.util.Map<String, List<CourseTaskDto>> grouped = mappedTasks.stream()
                .collect(java.util.stream.Collectors.groupingBy(CourseTaskDto::evaluationType, java.util.LinkedHashMap::new, java.util.stream.Collectors.toList()));

        List<EvaluationTaskGroupingDto> breakdown = new ArrayList<>();
        grouped.forEach((type, list) -> {
            int d = (int) list.stream().filter(CourseTaskDto::isDelivered).count();
            int p = list.size() - d;
            int pastDue = (int) list.stream().filter(it -> "PASADA_NO_ENTREGADA".equals(it.timingStatus())).count();

            Integer weight = null;
            String desc = list.get(0).evaluationDescription();
            for (var ev : syllabusEvals) {
                if (ev.getType() != null && ev.getType().equalsIgnoreCase(type)) {
                    weight = ev.getWeightPercent();
                    if (ev.getDescription() != null && !ev.getDescription().isBlank()) {
                        desc = ev.getDescription();
                    }
                    break;
                }
            }
            if (weight == null) {
                RubroMatch m = resolveRubroFromSyllabus(type, syllabusEvals);
                if (m != null) {
                    for (var ev : syllabusEvals) {
                        if (ev.getType() != null && ev.getType().equalsIgnoreCase(m.type())) {
                            weight = ev.getWeightPercent();
                            if (ev.getDescription() != null && !ev.getDescription().isBlank()) {
                                desc = ev.getDescription();
                            }
                            break;
                        }
                    }
                }
            }

            breakdown.add(new EvaluationTaskGroupingDto(type, desc, weight, list.size(), d, p, pastDue, list));
        });

        return new CourseTasksAndActivitiesResult(
                code, targetCourseCode, targetCourseName, currentWeek, gradingFormula,
                hasParticipation, participationWeight,
                courseTasks.size(), deliveredCount, pendingCount, pastDueUnsubmittedCount,
                breakdown, mappedTasks, null
        );
    }

    public TaskDetailResult getTaskDetail(String studentCode, String courseQuery, String taskQuery) {
        String code = resolveEffectiveStudentCode(studentCode);
        String cleanCourseQuery = (courseQuery != null) ? courseQuery.trim() : "";
        String cleanTaskQuery = (taskQuery != null) ? taskQuery.trim() : "";

        if (code == null || code.isBlank()) {
            return new TaskDetailResult(
                    "", cleanCourseQuery, "", "", cleanTaskQuery, null, "", "",
                    null, null, null, null, null, null, List.of(), "", "",
                    null, null, List.of(),
                    "No se identificó una sesión de estudiante activa. Inicia sesión para consultar el detalle de la tarea."
            );
        }

        if (cleanCourseQuery.isBlank()) {
            return new TaskDetailResult(
                    code, "", "", "", cleanTaskQuery, null, "", "",
                    null, null, null, null, null, null, List.of(), "", "",
                    null, null, List.of(),
                    "Argumento obligatorio 'course_query' ausente: indica el nombre o código oficial del curso."
            );
        }

        if (cleanTaskQuery.isBlank()) {
            return new TaskDetailResult(
                    code, cleanCourseQuery, "", "", "", null, "", "",
                    null, null, null, null, null, null, List.of(), "", "",
                    null, null, List.of(),
                    "Argumento obligatorio 'task_query' ausente: indica el título, nombre o identificador de la tarea."
            );
        }

        // 1. Resolver curso desde asignaturas matriculadas
        String resolvedCourseCode = null;
        String resolvedCourseName = null;
        try {
            EnrolledCoursesResult enrolled = getEnrolledCourses(code);
            if (enrolled != null && enrolled.courses() != null) {
                String normQuery = normalizeTerm(cleanCourseQuery);
                for (var ec : enrolled.courses()) {
                    String normEcName = normalizeTerm(ec.courseName());
                    String normEcCode = normalizeTerm(ec.courseCode());
                    if (normEcName.contains(normQuery) || normQuery.contains(normEcName)
                            || normEcCode.equalsIgnoreCase(normQuery)) {
                        resolvedCourseCode = ec.courseCode();
                        resolvedCourseName = ec.courseName();
                        break;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[AcademicTool] Error resolviendo curso matriculado para detalle de tarea: {}", e.getMessage());
        }

        String targetCourseCode = (resolvedCourseCode != null) ? resolvedCourseCode : cleanCourseQuery;
        String targetCourseName = (resolvedCourseName != null) ? resolvedCourseName : cleanCourseQuery;

        // 2. Resolver sectionId de la sección asignada
        String resolvedSectionId = resolveSectionIdForCourse(code, targetCourseCode, targetCourseName);

        // 3. Obtener lista de tareas del curso para emparejar la tarea solicitada
        CourseTasksAndActivitiesResult courseTasks = getCourseTasksAndActivities(code, targetCourseCode);
        List<CourseTaskDto> candidateTasks = (courseTasks != null && courseTasks.tasks() != null)
                ? courseTasks.tasks()
                : List.of();

        CourseTaskDto matchedTask = null;
        String normTaskQuery = normalizeTerm(cleanTaskQuery);

        for (var t : candidateTasks) {
            if (t.id() != null && t.id().equalsIgnoreCase(cleanTaskQuery)) {
                matchedTask = t;
                break;
            }
            if (t.title() != null) {
                String normTitle = normalizeTerm(t.title());
                if (normTitle.equalsIgnoreCase(normTaskQuery) || normTitle.contains(normTaskQuery) || normTaskQuery.contains(normTitle)) {
                    matchedTask = t;
                    break;
                }
            }
        }

        String effectiveSectionId = resolvedSectionId;
        String effectiveActivityId = (matchedTask != null && matchedTask.id() != null && !matchedTask.id().isBlank())
                ? matchedTask.id()
                : cleanTaskQuery;

        if (effectiveSectionId == null || effectiveSectionId.isBlank()) {
            return new TaskDetailResult(
                    code, targetCourseCode, targetCourseName, effectiveActivityId, cleanTaskQuery, null, "", "",
                    null, null, null, null, null, null, List.of(), "", "",
                    null, null, List.of(),
                    "No se pudo determinar la sección (sectionId) para el curso " + targetCourseName + ". Sincroniza tu horario e intenta nuevamente."
            );
        }

        // 4. Invocar pasarela oficial para obtener detalle, consigna y rúbrica
        String token = resolveStudentToken(code);
        com.fasterxml.jackson.databind.JsonNode detailNode = null;
        try {
            if (taskQueryService != null) {
                detailNode = taskQueryService.getTaskDetail(code, token, effectiveSectionId, effectiveActivityId);
            } else if (utpPortalGateway != null) {
                detailNode = utpPortalGateway.fetchTaskDetail(token, effectiveSectionId, effectiveActivityId);
            }
        } catch (Exception ex) {
            log.error("[AcademicTool] ❌ Error consultando detalle de tarea {} en sección {}: {}",
                    effectiveActivityId, effectiveSectionId, ex.getMessage(), ex);
            return new TaskDetailResult(
                    code, targetCourseCode, targetCourseName, effectiveActivityId,
                    matchedTask != null ? matchedTask.title() : cleanTaskQuery,
                    matchedTask != null ? matchedTask.week() : null,
                    matchedTask != null ? matchedTask.evaluationType() : "",
                    matchedTask != null ? matchedTask.homeworkStatus() : "PENDING",
                    matchedTask != null ? matchedTask.maxScore() : 20.0,
                    1, null, null,
                    matchedTask != null ? matchedTask.dueDate() : null,
                    false, List.of(), "", "",
                    null, null, List.of(),
                    "Error al obtener detalle oficial de la tarea desde el portal UTP: " + ex.getMessage()
            );
        }

        if (detailNode == null || detailNode.isMissingNode() || detailNode.isNull()) {
            return new TaskDetailResult(
                    code, targetCourseCode, targetCourseName, effectiveActivityId,
                    matchedTask != null ? matchedTask.title() : cleanTaskQuery,
                    matchedTask != null ? matchedTask.week() : null,
                    matchedTask != null ? matchedTask.evaluationType() : "",
                    matchedTask != null ? matchedTask.homeworkStatus() : "PENDING",
                    matchedTask != null ? matchedTask.maxScore() : 20.0,
                    1, null, null,
                    matchedTask != null ? matchedTask.dueDate() : null,
                    false, List.of(), "", "",
                    null, null, List.of(),
                    "La tarea " + cleanTaskQuery + " no cuenta con especificación o rúbrica disponible en el aula virtual de UTP."
            );
        }

        return parseTaskDetailNode(code, targetCourseCode, targetCourseName, matchedTask, detailNode);
    }

    private TaskDetailResult parseTaskDetailNode(String studentCode, String courseCode, String courseName,
                                                 CourseTaskDto matchedTask, com.fasterxml.jackson.databind.JsonNode data) {
        String id = data.path("id").asText(matchedTask != null ? matchedTask.id() : "");
        String title = data.path("title").asText(matchedTask != null ? matchedTask.title() : "");
        Integer week = matchedTask != null ? matchedTask.week() : null;
        String evalSystem = data.hasNonNull("evaluationSystem") ? data.path("evaluationSystem").asText() :
                (matchedTask != null ? matchedTask.evaluationType() : "");
        String status = data.hasNonNull("homeworkStatus") ? data.path("homeworkStatus").asText() :
                (matchedTask != null ? matchedTask.homeworkStatus() : "PENDING");
        Double topScore = data.hasNonNull("evaluationTopScore") ? data.path("evaluationTopScore").asDouble() :
                (matchedTask != null ? matchedTask.maxScore() : 20.0);
        Integer maxAttempts = data.hasNonNull("attempts") ? data.path("attempts").asInt() :
                (data.hasNonNull("maxAttempts") ? data.path("maxAttempts").asInt() : 1);
        String availableFrom = data.path("availableFrom").asText(null);
        String availableUntil = data.path("availableUntil").asText(null);
        String dueAt = data.hasNonNull("dueAt") ? data.path("dueAt").asText(null) : availableUntil;
        Boolean isGroup = data.path("isGroup").asBoolean(false);

        List<String> submissionTypes = new ArrayList<>();
        if (data.has("submissionTypes") && data.path("submissionTypes").isArray()) {
            for (com.fasterxml.jackson.databind.JsonNode st : data.path("submissionTypes")) {
                submissionTypes.add(st.asText());
            }
        }

        String descMd = data.path("descriptionMarkdown").asText("");
        if (descMd.isBlank() && data.hasNonNull("content")) {
            descMd = data.path("content").asText("");
        }

        String deliverablesMd = data.path("deliverablesMarkdown").asText("");
        if (deliverablesMd.isBlank() && data.hasNonNull("deliverables")) {
            deliverablesMd = data.path("deliverables").asText("");
        }

        String rubricName = null;
        Double rubricScore = null;
        List<RubricCriterionDto> rubricCriteria = new ArrayList<>();

        com.fasterxml.jackson.databind.JsonNode rubricNode = data.hasNonNull("rubric") ? data.path("rubric") : null;
        if (rubricNode != null && rubricNode.isObject()) {
            rubricName = rubricNode.path("name").asText(null);
            rubricScore = rubricNode.hasNonNull("score") ? rubricNode.path("score").asDouble() : null;
            com.fasterxml.jackson.databind.JsonNode criterionsNode = rubricNode.path("criterions");
            if (criterionsNode != null && criterionsNode.isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode cNode : criterionsNode) {
                    rubricCriteria.add(parseRubricCriterion(cNode));
                }
            }
        } else if (data.has("gradingRubric") && data.path("gradingRubric").isArray()) {
            rubricName = data.path("rubricName").asText(null);
            rubricScore = data.hasNonNull("rubricScore") ? data.path("rubricScore").asDouble() : null;
            for (com.fasterxml.jackson.databind.JsonNode cNode : data.path("gradingRubric")) {
                rubricCriteria.add(parseRubricCriterion(cNode));
            }
        }

        return new TaskDetailResult(
                studentCode, courseCode, courseName, id, title, week, evalSystem, status,
                topScore, maxAttempts, availableFrom, availableUntil, dueAt, isGroup,
                submissionTypes, descMd, deliverablesMd, rubricName, rubricScore,
                rubricCriteria, null
        );
    }

    private RubricCriterionDto parseRubricCriterion(com.fasterxml.jackson.databind.JsonNode cNode) {
        String name = cNode.path("name").asText("Criterio");
        Double score = cNode.hasNonNull("score") ? cNode.path("score").asDouble() : 0.0;
        String desc = cNode.path("description").asText("");
        List<RubricRatingDto> ratings = new ArrayList<>();
        com.fasterxml.jackson.databind.JsonNode prNode = cNode.has("performanceRatings") ? cNode.path("performanceRatings") :
                (cNode.has("levels") ? cNode.path("levels") : null);
        if (prNode != null && prNode.isArray()) {
            for (com.fasterxml.jackson.databind.JsonNode r : prNode) {
                ratings.add(new RubricRatingDto(
                        r.hasNonNull("score") ? r.path("score").asDouble() : 0.0,
                        r.path("name").asText(""),
                        r.path("description").asText("")
                ));
            }
        }
        return new RubricCriterionDto(name, score, desc, ratings);
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

    /**
     * Patrón canónico del código de catálogo de la UTP:
     * Exactamente 6 dígitos seguidos de 4 caracteres alfanuméricos (ej. "100000ST61", "100000SI82").
     */
    private static final Pattern UTP_CATALOG_CODE_PATTERN = Pattern.compile("(?i)^\\d{6}[A-Z0-9]{4}$");

    /**
     * Valida si una cadena cumple con el formato del código de catálogo oficial de la UTP.
     */
    private boolean isOfficialCatalogCode(String code) {
        if (code == null || code.isBlank()) {
            return false;
        }
        return UTP_CATALOG_CODE_PATTERN.matcher(code.trim()).matches();
    }

    /**
     * Resuelve el código oficial de un curso a partir del candidato, horario persistido (sesiones) o del catálogo de sílabos.
     * Exige evidencia institucional comprobable (sesión en horario o sílabo registrado), no solo formato sintáctico.
     */
    private String resolveOfficialCode(ScheduleInterval schedule, String courseName, String candidateCode) {
        String candidate = trimToNull(candidateCode);
        if (isOfficialCatalogCode(candidate)) {
            boolean backedBySession = schedule != null && schedule.getClasses() != null && schedule.getClasses().stream()
                    .anyMatch(cl -> candidate.equalsIgnoreCase(trimToNull(cl.getCourseCode())));
            if (backedBySession || syllabusRepository.findByCourseCode(candidate).isPresent()) {
                return candidate.toUpperCase();
            }
        }
        if (courseName == null || courseName.isBlank()) {
            return null;
        }
        String key = normalizeTerm(courseName);
        if (schedule != null && schedule.getClasses() != null) {
            for (ClassSession cl : schedule.getClasses()) {
                String code = trimToNull(cl.getCourseCode());
                String name = trimToNull(cl.getCourseName());
                if (code != null && name != null && key.equals(normalizeTerm(name)) && isOfficialCatalogCode(code)) {
                    return code.toUpperCase();
                }
            }
        }
        return syllabusRepository.findByCourseName(courseName)
                .map(Syllabus::getCourseCode)
                .map(AcademicToolService::trimToNull)
                .map(String::toUpperCase)
                .orElse(null);
    }

    /**
     * Resuelve el código oficial de cada curso declarado en el horario persistido:
     * 1. Course.code si la entidad ya lo contiene y cuenta con respaldo institucional verificable.
     * 2. ClassSession.courseCode del mismo horario, emparejando por nombre normalizado.
     * 3. syllabusRepository.findByCourseName(...) en MySQL como recurso institucional.
     */
    private List<EnrolledCourseDto> resolveCoursesFromPersistedSchedule(ScheduleInterval schedule) {
        if (schedule == null) {
            return List.of();
        }

        Map<String, EnrolledCourseDto> resolved = new LinkedHashMap<>();
        List<Course> declared = schedule.getCourses();

        if (declared != null && !declared.isEmpty()) {
            for (Course c : declared) {
                String name = trimToNull(c.getName());
                String code = resolveOfficialCode(schedule, name, c.getCode());
                if (code == null) {
                    log.warn("[AcademicTool] ⚠️ Curso '{}' sin código oficial resoluble en horario ni sílabo", name);
                }

                String key = code != null ? code : "name:" + normalizeTerm(name == null ? "" : name);
                resolved.putIfAbsent(key, new EnrolledCourseDto(code == null ? "" : code, name));
            }
        }

        // Si no hay cursos declarados, derivar de las sesiones (comportamiento original)
        if (resolved.isEmpty() && schedule.getClasses() != null) {
            Map<String, String> nameByCode = new LinkedHashMap<>();
            for (ClassSession cl : schedule.getClasses()) {
                String code = trimToNull(cl.getCourseCode());
                if (code == null) continue;
                String name = trimToNull(cl.getCourseName());
                nameByCode.putIfAbsent(code, name);
            }
            nameByCode.forEach((code, name) -> {
                String resolvedCode = resolveOfficialCode(schedule, name, code);
                String finalCode = resolvedCode != null ? resolvedCode : (isOfficialCatalogCode(code) ? code : "");
                resolved.put(finalCode, new EnrolledCourseDto(finalCode, name != null ? name : code));
            });
        }

        return new ArrayList<>(resolved.values());
    }

    /**
     * Resuelve el sectionId oficial del estudiante para la asignatura, desde el horario persistido.
     * Soporta coincidencia cruzada por código oficial (p. ej. 100000SI97) o por nombre
     * (p. ej. Servicios Cloud), ya que la pasarela institucional puede almacenar el nombre de la
     * asignatura en la columna course_code de las sesiones de clase.
     */
    private String resolveSectionIdForCourse(String studentCode, String courseCode, String courseName) {
        Optional<ScheduleInterval> scheduleOpt =
                scheduleRepository.findByStudentIdAndPeriod(studentCode, getCurrentPeriod());
        if (scheduleOpt.isEmpty()) {
            log.warn("[AcademicTool] No se halló horario para [{}] en periodo [{}] al resolver sectionId",
                    studentCode, getCurrentPeriod());
            return null;
        }
        ScheduleInterval schedule = scheduleOpt.get();
        String code = trimToNull(courseCode);
        String name = trimToNull(courseName);
        String normCode = normalizeTerm(code);
        String normName = normalizeTerm(name);

        if (schedule.getClasses() != null) {
            for (ClassSession cl : schedule.getClasses()) {
                String clCode = normalizeTerm(cl.getCourseCode());
                String clName = normalizeTerm(cl.getCourseName());
                boolean matches = (!normCode.isBlank() && (normCode.equals(clCode) || normCode.equals(clName)))
                        || (!normName.isBlank() && (normName.equals(clCode) || normName.equals(clName)));
                if (matches) {
                    String sectionId = trimToNull(cl.getSectionId());
                    if (sectionId == null) sectionId = trimToNull(cl.getSection());
                    if (sectionId != null) {
                        log.info("[AcademicTool] 🎯 sectionId resuelto desde ClassSession para [code='{}', name='{}']: {}",
                                code, name, sectionId);
                        return sectionId;
                    }
                }
            }
        }
        if (schedule.getCourses() != null) {
            for (Course c : schedule.getCourses()) {
                String cCode = normalizeTerm(c.getCode());
                String cName = normalizeTerm(c.getName());
                boolean matches = (!normCode.isBlank() && (normCode.equals(cCode) || normCode.equals(cName)))
                        || (!normName.isBlank() && (normName.equals(cCode) || normName.equals(cName)));
                if (matches) {
                    String section = trimToNull(c.getSection());
                    if (section != null) {
                        log.info("[AcademicTool] 🎯 sectionId resuelto desde Course para [code='{}', name='{}']: {}",
                                code, name, section);
                        return section;
                    }
                }
            }
        }
        log.warn("[AcademicTool] No se pudo resolver sectionId para curso [code='{}', name='{}'] en horario de [{}]",
                code, name, studentCode);
        return null;
    }

    /** Fusión por clave canónica: el calendario aporta estado de entrega; el árbol aporta semana/rubro. */
    private List<com.utp.horario.domain.model.aggregate.TaskSyncItem> mergeTasks(
            List<com.utp.horario.domain.model.aggregate.TaskSyncItem> calendarTasks,
            List<com.utp.horario.domain.model.aggregate.TaskSyncItem> sectionTasks) {
        Map<String, com.utp.horario.domain.model.aggregate.TaskSyncItem> merged = new LinkedHashMap<>();
        for (com.utp.horario.domain.model.aggregate.TaskSyncItem t : sectionTasks) {
            merged.putIfAbsent(taskKey(t), t);
        }
        for (com.utp.horario.domain.model.aggregate.TaskSyncItem t : calendarTasks) {
            // Map.merge(existing, incoming): "existing" es la versión del árbol (insertada antes);
            // "incoming" es la del calendario, que aporta el estado real de entrega del alumno.
            merged.merge(taskKey(t), t,
                    (section, calendar) -> mergeTaskSyncItems(calendar, section));
        }
        return new ArrayList<>(merged.values());
    }

    private String taskKey(com.utp.horario.domain.model.aggregate.TaskSyncItem t) {
        String title = trimToNull(t.getTitle());
        if (title != null) return "title:" + normalizeTerm(title);
        String contentId = trimToNull(t.getContentId());
        if (contentId != null) return "content:" + contentId;
        String id = trimToNull(t.getId());
        return "id:" + (id != null ? id : "");
    }

    private static com.utp.horario.domain.model.aggregate.TaskSyncItem mergeTaskSyncItems(
            com.utp.horario.domain.model.aggregate.TaskSyncItem calendar,
            com.utp.horario.domain.model.aggregate.TaskSyncItem section) {
        return com.utp.horario.domain.model.aggregate.TaskSyncItem.builder()
                .id(firstNonBlank(calendar.getId(), section.getId()))
                .studentId(firstNonBlank(calendar.getStudentId(), section.getStudentId()))
                .courseCode(firstNonBlank(calendar.getCourseCode(), section.getCourseCode()))
                .courseName(firstNonBlank(calendar.getCourseName(), section.getCourseName()))
                .sectionId(firstNonBlank(calendar.getSectionId(), section.getSectionId()))
                .contentId(firstNonBlank(calendar.getContentId(), section.getContentId()))
                .homeworkId(firstNonBlank(calendar.getHomeworkId(), section.getHomeworkId()))
                .title(firstNonBlank(calendar.getTitle(), section.getTitle()))
                .type(firstNonBlank(calendar.getType(), section.getType()))
                .week(calendar.getWeek() != null ? calendar.getWeek() : section.getWeek())
                .homeworkStatus(firstNonBlank(calendar.getHomeworkStatus(), section.getHomeworkStatus()))
                .assignmentProgress(firstNonBlank(calendar.getAssignmentProgress(), section.getAssignmentProgress()))
                .dueDate(calendar.getDueDate() != null ? calendar.getDueDate() : section.getDueDate())
                .maxScore(calendar.getMaxScore() != null ? calendar.getMaxScore() : section.getMaxScore())
                .score(calendar.getScore() != null ? calendar.getScore() : section.getScore())
                .isDelivered(calendar.getIsDelivered() != null ? calendar.getIsDelivered() : section.getIsDelivered())
                .isQualified(calendar.getIsQualified() != null ? calendar.getIsQualified() : section.getIsQualified())
                .evaluationSystem(firstNonBlank(calendar.getEvaluationSystem(), section.getEvaluationSystem()))
                .classificationCategory(firstNonBlank(calendar.getClassificationCategory(), section.getClassificationCategory()))
                .urgency(firstNonBlank(calendar.getUrgency(), section.getUrgency()))
                .daysRemaining(calendar.getDaysRemaining() != null ? calendar.getDaysRemaining() : section.getDaysRemaining())
                .syllabusCorrelation(calendar.getSyllabusCorrelation() != null
                        ? calendar.getSyllabusCorrelation() : section.getSyllabusCorrelation())
                .build();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }
        return null;
    }

    /** Rubro oficial resuelto desde el sílabo persistido (nunca fabricado). */
    private record RubroMatch(String type, String description) {}

    /**
     * Correlaciona el título de una actividad con las evaluaciones OFICIALES del sílabo ya cargado.
     * Precedencia: descripción oficial completa → código del rubro como token independiente.
     * Se exigen límites de token para no asociar "PAGAR"/"PADRE" al rubro "PA".
     */
    private RubroMatch resolveRubroFromSyllabus(String title,
            List<com.utp.horario.domain.model.value_objects.SyllabusEvaluation> syllabusEvals) {
        if (title == null || title.isBlank() || syllabusEvals == null || syllabusEvals.isEmpty()) {
            return null;
        }
        String normTitle = normalizeTerm(title);

        for (com.utp.horario.domain.model.value_objects.SyllabusEvaluation ev : syllabusEvals) {
            String type = trimToNull(ev.getType());
            String desc = trimToNull(ev.getDescription());
            if (type == null || desc == null) continue;
            String normDesc = normalizeTerm(desc);
            if (normDesc.equals(normTitle) || containsNormalizedPhrase(normTitle, normDesc)) {
                return new RubroMatch(type.toUpperCase(), desc);
            }
        }

        for (com.utp.horario.domain.model.value_objects.SyllabusEvaluation ev : syllabusEvals) {
            String type = trimToNull(ev.getType());
            if (type == null) continue;
            String normType = normalizeTerm(type);
            if (normType.isBlank() || !containsCodeToken(normTitle, normType)) continue;
            String desc = trimToNull(ev.getDescription());
            return new RubroMatch(type.toUpperCase(),
                    desc != null ? desc : "Evaluación del sílabo: " + type);
        }
        return null;
    }

    private static boolean isOfficialRubroType(
            List<com.utp.horario.domain.model.value_objects.SyllabusEvaluation> syllabusEvals, String candidate) {
        if (candidate == null || syllabusEvals == null) return false;
        return syllabusEvals.stream()
                .map(com.utp.horario.domain.model.value_objects.SyllabusEvaluation::getType)
                .filter(java.util.Objects::nonNull)
                .anyMatch(t -> t.trim().equalsIgnoreCase(candidate.trim()));
    }

    private boolean containsNormalizedPhrase(String haystack, String phrase) {
        String p = normalizeTerm(phrase);
        if (p.isBlank()) return false;
        return (" " + normalizeTerm(haystack) + " ").contains(" " + p + " ");
    }

    /** Comprueba un código de rubro (PA, PC1, PROY) como PALABRA completa, no como subcadena. */
    private static boolean containsCodeToken(String haystack, String code) {
        String needle = stripDiacritics(code);
        String text = " " + stripDiacritics(haystack) + " ";
        if (needle.isBlank()) return false;
        int from = 0;
        while ((from = text.indexOf(needle, from)) >= 0) {
            int end = from + needle.length();
            boolean left = from == 0 || !Character.isLetterOrDigit(text.charAt(from - 1));
            boolean right = end == text.length() || !Character.isLetterOrDigit(text.charAt(end));
            if (left && right) return true;
            from = end;
        }
        return false;
    }

    private static String stripDiacritics(String text) {
        if (text == null) return "";
        String nfd = java.text.Normalizer.normalize(text.toLowerCase(), java.text.Normalizer.Form.NFD);
        return nfd.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

}

