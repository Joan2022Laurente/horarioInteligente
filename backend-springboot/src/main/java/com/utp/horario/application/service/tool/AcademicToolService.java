package com.utp.horario.application.service.tool;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.ClassSession;
import com.utp.horario.domain.model.ScheduleInterval;
import com.utp.horario.domain.model.Syllabus;
import com.utp.horario.domain.model.tool.AcademicToolDto.*;
import com.utp.horario.domain.port.out.ScheduleRepositoryPort;
import com.utp.horario.domain.port.out.SyllabusRepositoryPort;
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
        log.info("[AcademicTool] 🕒 Consultando horario para alumno {} en fecha {}", studentCode, dateIso);
        LocalDate targetDate = (dateIso != null && !dateIso.isBlank()) ? LocalDate.parse(dateIso) : LocalDate.now();
        DayOfWeek targetDayOfWeek = targetDate.getDayOfWeek();

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
                    if (c.getStartAt().toLocalDate().equals(targetDate) || c.getStartAt().getDayOfWeek() == targetDayOfWeek) {
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

        return new DayScheduleResult(studentCode, targetDate.toString(), dayClasses.size(), dayClasses);
    }

    /**
     * Tool 2: Obtiene los detalles de un sílabo (fórmula, logro y ponderaciones).
     * Soporta fallback automático a Supabase si no se encuentra en el repositorio local.
     */
    public SyllabusDetailsResult getSyllabusDetails(String courseCode) {
        log.info("[AcademicTool] 📚 Consultando sílabo de curso: {}", courseCode);
        String cleanCode = courseCode.trim().toUpperCase();
        Optional<Syllabus> syllabusOpt = syllabusRepositoryPort.findByCourseCode(cleanCode);

        if (syllabusOpt.isEmpty()) {
            log.info("[AcademicTool] ☁️ Sílabo no hallado en BD local para [{}]. Consultando Supabase 'official_syllabi'...", cleanCode);
            syllabusOpt = fetchSyllabusFromSupabase(cleanCode);
        }

        if (syllabusOpt.isEmpty()) {
            return new SyllabusDetailsResult(cleanCode, "Curso no encontrado", 0, "", "No disponible", List.of());
        }

        Syllabus s = syllabusOpt.get();
        List<EvaluationSummaryDto> evals = s.getEvaluations() != null ? s.getEvaluations().stream()
                .map(e -> new EvaluationSummaryDto(
                        s.getCourseCode(),
                        s.getCourseName(),
                        e.getType(),
                        e.getDescription(),
                        e.getWeightPercent() != null ? e.getWeightPercent() : 0,
                        e.getWeek() != null ? e.getWeek() : 1
                )).toList() : List.of();

        return new SyllabusDetailsResult(
                s.getCourseCode(),
                s.getCourseName(),
                s.getCredits() != null ? s.getCredits() : 3,
                s.getFormula() != null ? s.getFormula() : "",
                s.getLearningGoal() != null ? s.getLearningGoal() : "No especificado",
                evals
        );
    }

    /**
     * Tool 3: Obtiene las evaluaciones próximas del alumno a partir de los sílabos de sus cursos activos.
     * Soporta fallback a Supabase tanto para el horario del alumno como para los sílabos oficiales.
     */
    public List<EvaluationSummaryDto> getUpcomingEvaluations(String studentCode, int currentWeek) {
        log.info("[AcademicTool] 🎯 Consultando evaluaciones próximas para alumno {} desde semana {}", studentCode, currentWeek);
        List<EvaluationSummaryDto> upcoming = new ArrayList<>();

        Optional<ScheduleInterval> scheduleOpt = scheduleRepositoryPort.findByStudentIdAndPeriod(studentCode, "2026 - Ciclo 2 Agosto");
        if (scheduleOpt.isEmpty() || scheduleOpt.get().getCourses() == null || scheduleOpt.get().getCourses().isEmpty()) {
            scheduleOpt = fetchScheduleFromSupabase(studentCode);
        }

        if (scheduleOpt.isPresent() && scheduleOpt.get().getCourses() != null) {
            for (var course : scheduleOpt.get().getCourses()) {
                String code = course.getCode();
                Optional<Syllabus> sylOpt = syllabusRepositoryPort.findByCourseCode(code);
                if (sylOpt.isEmpty()) {
                    sylOpt = fetchSyllabusFromSupabase(code);
                }

                if (sylOpt.isPresent() && sylOpt.get().getEvaluations() != null) {
                    sylOpt.get().getEvaluations().stream()
                            .filter(e -> e.getWeek() != null && e.getWeek() >= currentWeek && e.getWeek() <= currentWeek + 3)
                            .forEach(e -> upcoming.add(new EvaluationSummaryDto(
                                    course.getCode(),
                                    course.getName(),
                                    e.getType(),
                                    e.getDescription(),
                                    e.getWeightPercent() != null ? e.getWeightPercent() : 0,
                                    e.getWeek() != null ? e.getWeek() : 1
                            )));
                }
            }
        }
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
                    if (scheduleDataNode != null && !scheduleDataNode.isNull()) {
                        String rawJson = scheduleDataNode.isTextual() ? scheduleDataNode.asText() : scheduleDataNode.toString();
                        ScheduleInterval parsed = objectMapper.readValue(rawJson, ScheduleInterval.class);
                        return Optional.ofNullable(parsed);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[AcademicTool] ℹ️ Error en fallback a Supabase student_schedules para [{}]: {}", studentCode, e.getMessage());
        }
        return Optional.empty();
    }

    /**
     * Consulta Supabase REST para obtener el sílabo si no está en BD local.
     */
    private Optional<Syllabus> fetchSyllabusFromSupabase(String courseCode) {
        try {
            String url = String.format("%s/rest/v1/official_syllabi?or=(course_code.eq.%s,course_name.ilike.*%s*)&select=*",
                    supabaseUrl,
                    java.net.URLEncoder.encode(courseCode, java.nio.charset.StandardCharsets.UTF_8),
                    java.net.URLEncoder.encode(courseCode, java.nio.charset.StandardCharsets.UTF_8));

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
                        return Optional.of(s);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[AcademicTool] ℹ️ Error en fallback a Supabase official_syllabi para [{}]: {}", courseCode, e.getMessage());
        }
        return Optional.empty();
    }
}
