package com.utp.horario.domain.model.exceptions;

/**
 * Recurso inexistente en la pasarela institucional (HTTP 404).
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
