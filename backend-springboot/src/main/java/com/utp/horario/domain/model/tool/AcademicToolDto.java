package com.utp.horario.domain.model.tool;

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
            String message
    ) {
        public DayScheduleResult(String studentCode, String date, int totalClasses, List<ClassSessionDto> classes) {
            this(studentCode, date, totalClasses, classes, null);
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

    public record SyllabusDetailsResult(
            String courseCode,
            String courseName,
            int credits,
            String formula,
            String learningGoal,
            List<EvaluationSummaryDto> evaluations,
            List<WeeklySessionDto> weeklySchedule
    ) {
        /** Constructor de compatibilidad (sin weeklySchedule) */
        public SyllabusDetailsResult(String courseCode, String courseName, int credits,
                                     String formula, String learningGoal,
                                     List<EvaluationSummaryDto> evaluations) {
            this(courseCode, courseName, credits, formula, learningGoal, evaluations, List.of());
        }
    }

    public record EnrolledCourseDto(
            String courseCode,
            String courseName
    ) {}

    public record EnrolledCoursesResult(
            String studentCode,
            int totalCourses,
            List<EnrolledCourseDto> courses
    ) {}
}
