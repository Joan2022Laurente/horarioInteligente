package com.utp.horario.domain.model.value_objets;

/**
 * Detalle de una evaluación dentro del resumen oficial de un curso (puerto
 * {@code IUtpPortalGateway#fetchCoursesSummary}).
 *
 * <p>Record puro de Java: inmutable por diseño. Vive en el Dominio para que el
 * contrato (puerto de salida) nunca expose tipos de la capa de Aplicación —
 * regla de direcciones DDD: las dependencias solo apuntan hacia el Dominio.</p>
 */
public record CourseEvaluationDetailDto(
        String shortName,
        String name,
        String value,
        boolean isGraded
) {}
