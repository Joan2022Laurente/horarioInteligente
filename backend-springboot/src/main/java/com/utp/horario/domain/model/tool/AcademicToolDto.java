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
            List<ClassSessionDto> classes
    ) {}

    public record EvaluationSummaryDto(
            String courseCode,
            String courseName,
            String evaluationType,
            String description,
            int weightPercent,
            int weekScheduled
    ) {}

    public record SyllabusDetailsResult(
            String courseCode,
            String courseName,
            int credits,
            String formula,
            String learningGoal,
            List<EvaluationSummaryDto> evaluations
    ) {}
}
