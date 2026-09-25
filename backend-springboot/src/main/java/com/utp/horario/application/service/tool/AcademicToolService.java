package com.utp.horario.application.service.tool;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.ClassSession;
import com.utp.horario.domain.model.ScheduleInterval;
import com.utp.horario.domain.model.Syllabus;
import com.utp.horario.domain.model.tool.AcademicToolDto.*;
import com.utp.horario.domain.port.out.ScheduleRepositoryPort;
import com.utp.horario.domain.port.out.SyllabusRepositoryPort;
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

    private final ScheduleRepositoryPort scheduleRepositoryPort;
    private final SyllabusRepositoryPort syllabusRepositoryPort;
    private final ObjectMapper objectMapper;

    /**
     * Tool 1: Obtiene las clases del estudiante para una fecha determinada.
     */
    public DayScheduleResult getTodaySchedule(String studentCode, String dateIso) {
        log.info("[AcademicTool] 🕒 Consultando horario para alumno {} en fecha {}", studentCode, dateIso);
        LocalDate targetDate = (dateIso != null && !dateIso.isBlank()) ? LocalDate.parse(dateIso) : LocalDate.now();
        DayOfWeek targetDayOfWeek = targetDate.getDayOfWeek();

        List<ClassSessionDto> dayClasses = new ArrayList<>();

        Optional<ScheduleInterval> scheduleOpt = scheduleRepositoryPort.findByStudentIdAndPeriod(studentCode, "2026 - Ciclo 2 Agosto");
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
     */
    public SyllabusDetailsResult getSyllabusDetails(String courseCode) {
        log.info("[AcademicTool] 📚 Consultando sílabo de curso: {}", courseCode);
        Optional<Syllabus> syllabusOpt = syllabusRepositoryPort.findByCourseCode(courseCode.trim().toUpperCase());

        if (syllabusOpt.isEmpty()) {
            return new SyllabusDetailsResult(courseCode, "Curso no encontrado", 0, "", "No disponible", List.of());
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
     */
    public List<EvaluationSummaryDto> getUpcomingEvaluations(String studentCode, int currentWeek) {
        log.info("[AcademicTool] 🎯 Consultando evaluaciones próximas para alumno {} desde semana {}", studentCode, currentWeek);
        List<EvaluationSummaryDto> upcoming = new ArrayList<>();

        Optional<ScheduleInterval> scheduleOpt = scheduleRepositoryPort.findByStudentIdAndPeriod(studentCode, "2026 - Ciclo 2 Agosto");
        if (scheduleOpt.isPresent() && scheduleOpt.get().getCourses() != null) {
            for (var course : scheduleOpt.get().getCourses()) {
                Optional<Syllabus> sylOpt = syllabusRepositoryPort.findByCourseCode(course.getCode());
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
}
