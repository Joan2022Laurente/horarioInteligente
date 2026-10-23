package com.utp.horario.domain.model.repositories;

import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import com.utp.horario.domain.model.value_objects.CourseSummaryDto;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import com.utp.horario.domain.model.value_objects.UpcomingEvaluationDto;

import java.util.List;

public interface IUtpPortalGateway {
    StudentProfile login(String username, String password);

    /**
     * Contrato de honestidad: devuelve el horario oficial del periodo, o {@code null}
     * si la pasarela no pudo entregarlo (fallo de red, timeout, error upstream).
     * El consumidor debe degradar al Read Model local o declarar la ausencia;
     * nunca persistir ni presentar objetos fabricados.
     */
    ScheduleInterval fetchSchedule(String token, String period);
    List<TaskSyncItem> fetchTasks(String token, String sectionId);
    Syllabus fetchSyllabus(String token, String courseCode, String sectionId, String pdfUrl);

    List<CourseSummaryDto> fetchCoursesSummary(String token);
    List<UpcomingEvaluationDto> fetchUpcomingEvaluations(String token, int limit);
    List<TaskSyncItem> fetchActivitiesByWeek(String token, Integer week);
    List<TaskSyncItem> fetchActivities(String token, String intervalMode, Integer week, String status, Boolean onlyGraded, String type);
    com.fasterxml.jackson.databind.JsonNode fetchTaskDetail(String token, String sectionId, String activityId);
    String fetchSyllabusMarkdown(String token, String courseCode);
    String exportCalendarIcs(String token, String period);

    void registerStudentToken(String studentCode, String token);
    String getStudentToken(String studentCode);
}
