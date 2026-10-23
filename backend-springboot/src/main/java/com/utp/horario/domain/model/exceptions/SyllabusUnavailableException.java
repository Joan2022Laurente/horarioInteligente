package com.utp.horario.domain.model.exceptions;

/**
 * El sílabo oficial solicitado no está disponible en este momento: ni el Read Model
 * local ni la pasarela externa entregaron contenido curricular verificable
 * (fórmula de evaluación y cronograma semanal).
 *
 * <p>Regla de honestidad de datos: la capa de presentación lo traduce a una respuesta
 * de ausencia reintentable (HTTP 503 con el sobre de error estándar). Nunca debe
 * traducirse a un objeto con créditos, modalidad u horas inventados.</p>
 */
public class SyllabusUnavailableException extends BusinessException {
    public SyllabusUnavailableException(String message) {
        super(message);
    }
}
