package com.utp.horario.domain.model.value_objets;

/**
 * Evaluación próxima oficial del alumno tal como la entrega el puerto
 * {@code IUtpPortalGateway#fetchUpcomingEvaluations}.
 *
 * <p>Record puro de Java: inmutable por diseño. Vive en el Dominio para que el
 * contrato (puerto de salida) nunca expose tipos de la capa de Aplicación.</p>
 */
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
