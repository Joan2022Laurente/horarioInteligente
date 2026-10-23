package com.utp.horario.interfaces.rest;

import com.utp.horario.domain.model.exceptions.ScheduleUnavailableException;
import com.utp.horario.domain.model.exceptions.StudentNotFoundException;
import com.utp.horario.domain.model.exceptions.SyllabusUnavailableException;
import com.utp.horario.interfaces.rest.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Mapeo centralizado de excepciones hacia respuestas HTTP semánticas con el sobre
 * estándar {@link ApiResponse}. Toda la traducción de errores de una sola capa
 * (interfaces) vive aquí; las capas de abajo solo lanzan excepciones de dominio o
 * de Java estándar, nunca construyen envelopes HTTP.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Regla de honestidad de datos: la ausencia de sílabo oficial se declara como
     * indisponibilidad reintentable (503) y nunca se enmascara con datos inventados.
     */
    @ExceptionHandler(SyllabusUnavailableException.class)
    public ResponseEntity<ApiResponse<Void>> handleSyllabusUnavailable(SyllabusUnavailableException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ApiResponse.fail(e.getMessage()));
    }

    /**
     * Regla de honestidad de datos: la ausencia del horario oficial se declara como
     * indisponibilidad reintentable (503) y nunca se enmascara con datos inventados.
     */
    @ExceptionHandler(ScheduleUnavailableException.class)
    public ResponseEntity<ApiResponse<Void>> handleScheduleUnavailable(ScheduleUnavailableException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ApiResponse.fail(e.getMessage()));
    }

    /**
     * Datos de entrada inválidos (parámetros requeridos, identidad mal formada): 400
     * explícito, distinto de errores internos.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.fail(e.getMessage()));
    }

    /**
     * Entidad de dominio no encontrada en una consulta de identidad real: 404.
     */
    @ExceptionHandler(StudentNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleStudentNotFound(StudentNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail(e.getMessage()));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiResponse<Void>> handleSecurityException(SecurityException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.fail(e.getMessage()));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Void>> handleRuntimeException(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.fail(e.getMessage()));
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(org.springframework.web.servlet.resource.NoResourceFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.fail("Recurso no encontrado: " + e.getResourcePath()));
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleResponseStatusException(org.springframework.web.server.ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.fail(e.getReason() != null ? e.getReason() : e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.fail("Error interno del servidor: " + e.getMessage()));
    }
}

