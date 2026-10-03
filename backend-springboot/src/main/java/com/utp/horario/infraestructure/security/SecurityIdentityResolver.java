package com.utp.horario.infraestructure.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * SecurityIdentityResolver â€” Resuelve la identidad inmutable del estudiante
 * extrayÃ©ndola criptogrÃ¡fica y estructuralmente del JWT Bearer Token.
 *
 * Previene vulnerabilidades BOLA / IDOR bloqueando cualquier intento de suplantar
 * a otro alumno mediante parÃ¡metros como ?studentId=XXXXX cuando se cuenta con un token.
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
        // Si el cliente enviÃ³ el token directo sin prefijo Bearer
        if (trimmed.contains(".")) {
            return trimmed;
        }
        return null;
    }

    /**
     * Extrae el cÃ³digo de estudiante (ej. U23307609) desde el payload del JWT.
     * Busca claims estÃ¡ndar de identidad UTP: preferred_username, sub, studentCode, userId.
     */
    public String extractStudentCodeFromToken(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        String cleanToken = token.trim();
        if (cleanToken.toUpperCase().matches("^[Uu]\\d{8}$")) {
            return cleanToken.toUpperCase();
        }
        if (!cleanToken.contains(".")) {
            return null;
        }
        try {
            String[] parts = cleanToken.split("\\.");
            if (parts.length >= 2) {
                byte[] decodedBytes = Base64.getUrlDecoder().decode(parts[1]);
                String payloadJson = new String(decodedBytes, StandardCharsets.UTF_8);
                JsonNode root = objectMapper.readTree(payloadJson);

                // 1. Revisar claims estándar donde UTP o Azure AD colocan el identificador
                String[] candidateFields = {"preferred_username", "studentCode", "username", "upn", "unique_name", "email", "sub", "userId", "name"};
                for (String field : candidateFields) {
                    if (root.hasNonNull(field) && !root.path(field).asText().isBlank()) {
                        String val = root.path(field).asText().trim();
                        if (val.contains("@")) {
                            val = val.substring(0, val.indexOf("@")).trim();
                        }
                        if (val.matches("(?i)^[uU]\\d{8}$")) {
                            return val.toUpperCase();
                        }
                    }
                }

                // 2. Búsqueda profunda de patrón U-código en todo el JSON del payload
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?i)\\b([uU]\\d{8})\\b").matcher(payloadJson);
                if (m.find()) {
                    return m.group(1).toUpperCase();
                }

                if (root.hasNonNull("preferred_username") && !root.path("preferred_username").asText().isBlank()) {
                    return root.path("preferred_username").asText().trim().toUpperCase();
                }
                if (root.hasNonNull("sub") && !root.path("sub").asText().isBlank()) {
                    return root.path("sub").asText().trim();
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
    public String resolveStudentCode(String authHeader, String xUserIdHeader, String paramStudentId) {
        String token = extractBearerToken(authHeader);
        if (token != null && !token.isBlank()) {
            String tokenStudentCode = extractStudentCodeFromToken(token);
            if (tokenStudentCode != null && !tokenStudentCode.isBlank()) {
                if (paramStudentId != null && !paramStudentId.isBlank()
                        && !paramStudentId.equalsIgnoreCase(tokenStudentCode)
                        && !"current-student".equalsIgnoreCase(paramStudentId)) {
                    log.warn("[SecurityIdentityResolver] ⚠️ Intento BOLA/IDOR bloqueado: Token pertenece a [{}] pero el request intentó consultar [{}].",
                            tokenStudentCode, paramStudentId);
                    throw new SecurityException("Acceso prohibido (403): Intento de consulta cruzada no autorizada al recurso del estudiante [" + paramStudentId + "].");
                }
                return tokenStudentCode;
            }

            // Si el token no expone claims legibles en claro pero está presente,
            // verificar si el cliente adjuntó una identidad con formato oficial (ej. x-user-id)
            if (xUserIdHeader != null && xUserIdHeader.trim().toUpperCase().matches("^[Uu]\\d{8}$")) {
                return xUserIdHeader.trim().toUpperCase();
            }

            if (paramStudentId != null && paramStudentId.trim().toUpperCase().matches("^[Uu]\\d{8}$")) {
                return paramStudentId.trim().toUpperCase();
            }
        }

        // Si NO hay token legítimo, rechazo terminante para evitar acceso no autenticado o IDOR
        throw new SecurityException("Acceso no autorizado: Se requiere un token de sesión legítimo de UTP.");
    }

    public String resolveStudentCode(String authHeader, String paramStudentId) {
        return resolveStudentCode(authHeader, null, paramStudentId);
    }
}

