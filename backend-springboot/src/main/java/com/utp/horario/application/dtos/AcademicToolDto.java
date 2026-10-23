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
            int totalClasses,
            List<ClassSessionDto> classes,
            String message,
            Integer weekNumber
    ) {
        public DayScheduleResult(String studentCode, String date, int totalClasses,
                                 List<ClassSessionDto> classes, String message) {
            this(studentCode, date, totalClasses, classes, message, null);
        }

        public DayScheduleResult(String studentCode, String date, int totalClasses, List<ClassSessionDto> classes) {
            this(studentCode, date, totalClasses, classes, null, null);
        }
    }

    public record EvaluationSummaryDto(
            String courseCode,
            String courseName,
            String evaluationType,
            String description,
            int weightPercent,
            int weekScheduled
    ) {}

    /**
     * Temario de una semana específica del sílabo.
     * topics: temas del día concatenados; activities: actividad prevista; evaluation: evaluación si aplica.
     */
    public record WeeklySessionDto(
            int week,
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

    public record CourseEvaluationDetailDto(
            String shortName,
            String name,
            String value,
            boolean isGraded
    ) {}

    public record CourseSummaryDto(
            String courseId,
            String courseCode,
            String courseName,
            String formula,
            String teacher,
            Integer credits,
            List<CourseEvaluationDetailDto> evaluations
    ) {}

    public record UpcomingEvaluationDto(
            String id,
            String title,
            String activityType,
            int weekNumber,
            String startAt,
            String finishAt,
            String courseName,
            String courseId,
            String sectionId,
            String activityId,
            String evaluationSystem,
            String studentStatus,
            boolean isQualified,
            String classificationCategory,
            String urgency,
            int daysRemaining
    ) {}
}
