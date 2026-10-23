package com.utp.horario.domain.model.exceptions;

/**
 * El horario oficial solicitado no está disponible en este momento: ni el Read Model
 * local ni la pasarela externa entregaron un horario verificable.
 *
 * <p>Regla de honestidad de datos: la capa de presentación lo traduce a una respuesta
 * de ausencia reintentable (HTTP 503 con el sobre de error estándar). Nunca debe
 * enmascararse con un intervalo fabricado (fechas hardcodeadas, 'interval-empty').</p>
 */
public class ScheduleUnavailableException extends BusinessException {
    public ScheduleUnavailableException(String message) {
        super(message);
    }
}
