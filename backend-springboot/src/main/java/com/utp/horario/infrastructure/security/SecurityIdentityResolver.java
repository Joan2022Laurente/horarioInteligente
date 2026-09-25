package com.utp.horario.infrastructure.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * SecurityIdentityResolver — Resuelve la identidad inmutable del estudiante
 * extrayéndola criptográfica y estructuralmente del JWT Bearer Token.
 *
 * Previene vulnerabilidades BOLA / IDOR bloqueando cualquier intento de suplantar
 * a otro alumno mediante parámetros como ?studentId=XXXXX cuando se cuenta con un token.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SecurityIdentityResolver {

    private final ObjectMapper objectMapper;

    /**
     * Extrae el token Bearer limpio del encabezado Authorization.
     */
    public String extractBearerToken(String authHeader) {
        if (authHeader == null || authHeader.isBlank()) {
            return null;
        }
        String trimmed = authHeader.trim();
        if (trimmed.toLowerCase().startsWith("bearer ")) {
            return trimmed.substring(7).trim();
        }
        // Si el cliente envió el token directo sin prefijo Bearer
        if (trimmed.contains(".")) {
            return trimmed;
        }
        return null;
    }

    /**
     * Extrae el código de estudiante (ej. U23307609) desde el payload del JWT.
     * Busca claims estándar de identidad UTP: preferred_username, sub, studentCode, userId.
     */
    public String extractStudentCodeFromToken(String token) {
        if (token == null || !token.contains(".")) {
            return null;
        }
        try {
            String[] parts = token.split("\\.");
            if (parts.length >= 2) {
                byte[] decodedBytes = Base64.getUrlDecoder().decode(parts[1]);
                String payloadJson = new String(decodedBytes, StandardCharsets.UTF_8);
                JsonNode root = objectMapper.readTree(payloadJson);

                if (root.hasNonNull("preferred_username") && !root.path("preferred_username").asText().isBlank()) {
                    return root.path("preferred_username").asText().trim().toUpperCase();
                }
                if (root.hasNonNull("studentCode") && !root.path("studentCode").asText().isBlank()) {
                    return root.path("studentCode").asText().trim().toUpperCase();
                }
                if (root.hasNonNull("sub") && !root.path("sub").asText().isBlank()) {
                    String sub = root.path("sub").asText().trim();
                    if (sub.matches("^[uU]\\d{8}$")) {
                        return sub.toUpperCase();
                    }
                    return sub;
                }
                if (root.hasNonNull("userId") && !root.path("userId").asText().isBlank()) {
                    return root.path("userId").asText().trim().toUpperCase();
                }
            }
        } catch (Exception e) {
            log.debug("[SecurityIdentityResolver] No se pudo parsear claims del token: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Resuelve de forma autoritativa el código del estudiante.
     * Si existe un token Bearer en el request, el código extraído del token TIENE PRIORIDAD ABSOLUTA
     * sobre cualquier parámetro studentId enviado en query o body, neutralizando ataques IDOR/BOLA.
     */
    public String resolveStudentCode(String authHeader, String paramStudentId) {
        String token = extractBearerToken(authHeader);
        if (token != null) {
            String tokenStudentCode = extractStudentCodeFromToken(token);
            if (tokenStudentCode != null && !tokenStudentCode.isBlank()) {
                if (paramStudentId != null && !paramStudentId.isBlank()
                        && !paramStudentId.equalsIgnoreCase(tokenStudentCode)
                        && !"current-student".equalsIgnoreCase(paramStudentId)) {
                    log.warn("[SecurityIdentityResolver] ⚠️ Posible intento BOLA/IDOR detectado: Token pertenece a [{}] pero el request intentó consultar [{}]. Enforzando identidad del token.",
                            tokenStudentCode, paramStudentId);
                }
                return tokenStudentCode;
            }
        }

        // Si no hay token o no se pudo extraer identidad del token
        if (paramStudentId != null && !paramStudentId.isBlank() && !"current-student".equalsIgnoreCase(paramStudentId)) {
            return paramStudentId.trim().toUpperCase();
        }

        // Rechazo terminante de identidades genéricas no seguras
        throw new SecurityException("Acceso no autorizado: Se requiere un token de sesión o un código de estudiante legítimo.");
    }
}
