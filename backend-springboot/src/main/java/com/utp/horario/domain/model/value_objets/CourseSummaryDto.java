package com.utp.horario.domain.model.value_objets;

import java.util.List;

/**
 * Resumen oficial de un curso tal como lo entrega el puerto
 * {@code IUtpPortalGateway#fetchCoursesSummary}.
 *
 * <p>Record puro de Java: inmutable por diseño. {@code credits} es nullable —
 * la honestidad de datos prohíbe inflar un valor por defecto (regla aplicada en
 * el canal IA y en la persistencia de sílabos).</p>
 */
public record CourseSummaryDto(
        String courseId,
        String courseCode,
        String courseName,
        String formula,
        String teacher,
        Integer credits,
        List<CourseEvaluationDetailDto> evaluations
) {}
