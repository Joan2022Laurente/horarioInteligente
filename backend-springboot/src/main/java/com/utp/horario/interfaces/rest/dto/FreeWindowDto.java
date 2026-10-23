package com.utp.horario.interfaces.rest.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Ventana de tiempo libre (gap entre clases) dentro del contrato del Matching
 * Dual. Nombres camelCase exactos al modelo {@code FreeWindow} del frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FreeWindowDto {

    private Integer dayNumber;

    private String dayName;

    private String startTime;

    private String endTime;

    private String campus;

    private String building;

    private String floor;
}
