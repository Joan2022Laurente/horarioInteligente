package com.utp.horario.domain.model.exceptions;

/**
 * Fallo de la pasarela institucional o de red. Se mapea a HTTP 502; nunca se
 * degrada a una respuesta vacía exitosa.
 */
public class UpstreamServiceException extends RuntimeException {

    public UpstreamServiceException(String message) {
        super(message);
    }

    public UpstreamServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
