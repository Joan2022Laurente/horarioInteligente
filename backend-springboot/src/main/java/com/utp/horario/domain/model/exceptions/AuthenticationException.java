package com.utp.horario.domain.model.exceptions;

/**
 * Credenciales ausentes, malformadas o rechazadas por la pasarela institucional.
 * Se mapea a HTTP 401 en la capa de interfaces.
 */
public class AuthenticationException extends RuntimeException {

    public AuthenticationException(String message) {
        super(message);
    }

    public AuthenticationException(String message, Throwable cause) {
        super(message, cause);
    }
}
