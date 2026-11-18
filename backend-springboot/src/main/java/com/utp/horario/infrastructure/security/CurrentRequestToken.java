package com.utp.horario.infrastructure.security;

import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Resuelve el Bearer token del alumno que origina la peticion HTTP actual.
 *
 * <p>No almacena tokens: solo lee la cabecera {@code Authorization} del request
 * en curso a traves del contexto de Spring. Sustituye al antiguo registro global
 * de tokens por codigo de alumno, que permitia reutilizar identidades ajenas.</p>
 */
@Component
public class CurrentRequestToken {

    private static final String BEARER_PREFIX = "Bearer ";

    /** Devuelve el JWT limpio de la request actual, o {@code null} si no hay una. */
    public String bearerToken() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs)) {
            return null;
        }
        String header = attrs.getRequest().getHeader("Authorization");
        if (header == null || !header.trim().regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            return null;
        }
        String token = header.trim().substring(BEARER_PREFIX.length()).trim();
        return token.isBlank() ? null : token;
    }
}
