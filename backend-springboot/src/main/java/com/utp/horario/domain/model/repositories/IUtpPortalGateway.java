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

    /**
     * Árbol canónico de contenidos del aula virtual de una sección
     * ({@code unities[] -> themes[] -> contents[]}). A diferencia de {@link #fetchActivities},
     * este recurso incluye TODO el historial de aprendizaje, no solo el calendario de alertas.
     *
     * @param token      token institucional del estudiante autenticado
     * @param sectionId  identificador de sección resuelto dinámicamente desde el horario oficial
     * @param courseCode código de catálogo de la asignatura (solo contextualiza el resultado)
     * @param courseName denominación oficial de la asignatura (solo contextualiza el resultado)
     * @return actividades evaluativas/entregables del árbol; lista vacía si la sección no contiene ninguna
     */
    List<TaskSyncItem> fetchSectionActivities(String token, String sectionId, String courseCode, String courseName);

    com.fasterxml.jackson.databind.JsonNode fetchTaskDetail(String token, String sectionId, String activityId);
    String fetchSyllabusMarkdown(String token, String courseCode);
    String exportCalendarIcs(String token, String period);
}
