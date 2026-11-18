package com.utp.horario.application.dtos;

import java.util.List;

public class AcademicToolDto {

    public record ClassSessionDto(
            String courseCode,
            String courseName,
            String startTime,
            String endTime,
            String building,
            String classroom,
            String teacherName
    ) {}

    public record DayScheduleResult(
            String studentCode,
            String date,
            String dayOfWeek,
            int totalClasses,
            List<ClassSessionDto> classes,
            String message,
            Integer weekNumber
    ) {
        public DayScheduleResult(String studentCode, String date, String dayOfWeek, int totalClasses,
                                 List<ClassSessionDto> classes, String message, Integer weekNumber) {
            this.studentCode = studentCode;
            this.date = date;
            this.dayOfWeek = dayOfWeek;
            this.totalClasses = totalClasses;
            this.classes = classes;
            this.message = message;
            this.weekNumber = weekNumber;
        }

        public DayScheduleResult(String studentCode, String date, int totalClasses,
                                 List<ClassSessionDto> classes, String message, Integer weekNumber) {
            this(studentCode, date, null, totalClasses, classes, message, weekNumber);
        }

        public DayScheduleResult(String studentCode, String date, int totalClasses,
                                 List<ClassSessionDto> classes, String message) {
            this(studentCode, date, null, totalClasses, classes, message, null);
        }

        public DayScheduleResult(String studentCode, String date, int totalClasses, List<ClassSessionDto> classes) {
            this(studentCode, date, null, totalClasses, classes, null, null);
        }
    }

    public record EvaluationSummaryDto(
            String courseCode,
            String courseName,
            String evaluationType,
            String description,
            Integer weightPercent,
            Integer weekScheduled
    ) {}

    /**
     * Temario de una semana específica del sílabo.
     * topics: temas del día concatenados; activities: actividad prevista; evaluation: evaluación si aplica.
     */
    public record WeeklySessionDto(
            Integer week,
            String unit,
            String topics,
            String activities,
            String evaluation
    ) {}

    /**
     * Detalle de sílabo para el canal IA. {@code credits} es {@link Integer} nullable:
     * cuando la fuente oficial no declara créditos (markdown sin franja de créditos),
     * se reporta {@code null} ("no indicado") y nunca un valor por defecto inflado —
     * regla de honestidad de datos.
     */
    public record SyllabusDetailsResult(
            String courseCode,
            String courseName,
            Integer credits,
            String formula,
            String learningGoal,
            List<EvaluationSummaryDto> evaluations,
            List<WeeklySessionDto> weeklySchedule,
            String markdown
    ) {
        /** Constructor de compatibilidad (sin weeklySchedule ni markdown) */
        public SyllabusDetailsResult(String courseCode, String courseName, int credits,
                                     String formula, String learningGoal,
                                     List<EvaluationSummaryDto> evaluations) {
            this(courseCode, courseName, credits, formula, learningGoal, evaluations, List.of(), null);
        }

        /** Constructor de compatibilidad (con weeklySchedule, sin markdown) */
        public SyllabusDetailsResult(String courseCode, String courseName, int credits,
                                     String formula, String learningGoal,
                                     List<EvaluationSummaryDto> evaluations,
                                     List<WeeklySessionDto> weeklySchedule) {
            this(courseCode, courseName, credits, formula, learningGoal, evaluations, weeklySchedule, null);
        }
    }

    public record EnrolledCourseDto(
            String courseCode,
            String courseName
    ) {}

    public record EnrolledCoursesResult(
            String studentCode,
            int totalCourses,
            List<EnrolledCourseDto> courses,
            String message
    ) {
        public EnrolledCoursesResult(String studentCode, int totalCourses, List<EnrolledCourseDto> courses) {
            this(studentCode, totalCourses, courses, null);
        }
    }

    /**
     * Sesión académica pendiente por cursar hoy o en curso en este momento,
     * enriquecida deterministamente con temario y evaluación del sílabo oficial.
     */
    public record RemainingClassSessionDto(
            String courseCode,
            String courseName,
            String status,              // "EN_CURSO" | "PROXIMA"
            String timeWindow,          // ej. "14:15 - 16:30"
            String startTime,           // "14:15"
            String endTime,             // "16:30"
            Long minutesUntilStart,     // 0 si EN_CURSO, >0 si PROXIMA
            String modality,            // "Presencial" | "Remota en Vivo" | "Virtual Asíncrono"
            String classroom,
            String building,
            String floor,
            String teacherName,
            String zoomLink,            // Enlace de Zoom si aplica
            String syllabusTopic,       // Tema oficial del sílabo para la semana vigente
            String syllabusActivities,  // Actividades planificadas
            String evaluationScheduled  // Evaluación si toca hoy (ej. "PC2 (20%) - Práctica Calificada 2")
    ) {}

    /**
     * Resultado determinista de clases restantes del día con temas de sílabo cruzados en el servidor.
     */
    public record RemainingClassesTodayResult(
            String studentCode,
            String date,
            String dayOfWeek,
            String currentTime,
            Integer currentWeek,
            int totalRemainingClasses,
            List<RemainingClassSessionDto> remainingClasses,
            String message
    ) {
        public RemainingClassesTodayResult(String studentCode, String date, String dayOfWeek, String currentTime,
                                           Integer currentWeek, int totalRemainingClasses,
                                           List<RemainingClassSessionDto> remainingClasses) {
            this(studentCode, date, dayOfWeek, currentTime, currentWeek, totalRemainingClasses, remainingClasses, null);
        }

        public RemainingClassesTodayResult(String studentCode, String date, String currentTime,
                                           Integer currentWeek, int totalRemainingClasses,
                                           List<RemainingClassSessionDto> remainingClasses) {
            this(studentCode, date, null, currentTime, currentWeek, totalRemainingClasses, remainingClasses, null);
        }

        public RemainingClassesTodayResult(String studentCode, String date, String currentTime,
                                           Integer currentWeek, int totalRemainingClasses,
                                           List<RemainingClassSessionDto> remainingClasses,
                                           String message) {
            this(studentCode, date, null, currentTime, currentWeek, totalRemainingClasses, remainingClasses, message);
        }
    }

    /**
     * Tarea o actividad individual del estudiante en un curso.
     */
    public record CourseTaskDto(
            String id,
            String title,
            Integer week,
            String dueDate,
            String homeworkStatus,
            boolean isDelivered,
            boolean isQualified,
            Double score,
            Double maxScore,
            String evaluationType,
            String evaluationDescription,
            String timingStatus
    ) {}

    /**
     * Agrupación de tareas por rubro de evaluación oficial del sílabo.
     */
    public record EvaluationTaskGroupingDto(
            String evaluationType,
            String evaluationDescription,
            Integer weightPercent,
            int totalTasks,
            int deliveredCount,
            int pendingCount,
            int pastDueUnsubmittedCount,
            List<CourseTaskDto> tasks
    ) {}

    /**
     * Resultado estructurado de tareas y actividades de un curso para el agente IA y MCP.
     */
    public record CourseTasksAndActivitiesResult(
            String studentCode,
            String courseCode,
            String courseName,
            Integer currentWeek,
            String gradingFormula,
            boolean hasParticipationGrade,
            Integer participationWeightPercent,
            int totalCourseTasks,
            int totalDelivered,
            int totalPending,
            int totalPastDueUnsubmitted,
            List<EvaluationTaskGroupingDto> evaluationBreakdown,
            List<CourseTaskDto> tasks,
            String message
    ) {
        public CourseTasksAndActivitiesResult(String studentCode, String courseCode, String courseName,
                                              Integer currentWeek, String gradingFormula,
                                              boolean hasParticipationGrade, Integer participationWeightPercent,
                                              int totalCourseTasks, int totalDelivered, int totalPending,
                                              int totalPastDueUnsubmitted,
                                              List<EvaluationTaskGroupingDto> evaluationBreakdown,
                                              List<CourseTaskDto> tasks) {
            this(studentCode, courseCode, courseName, currentWeek, gradingFormula, hasParticipationGrade,
                    participationWeightPercent, totalCourseTasks, totalDelivered, totalPending,
                    totalPastDueUnsubmitted, evaluationBreakdown, tasks, null);
        }
    }

}

