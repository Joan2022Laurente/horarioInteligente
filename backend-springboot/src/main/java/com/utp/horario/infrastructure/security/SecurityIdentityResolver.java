package com.utp.horario.infrastructure.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Resolucion de la identidad del estudiante a partir del JWT Bearer de la request.
 *
 * <p>Regla estricta: solo se acepta el esquema {@code Bearer} con un JWT de tres
 * segmentos no vacios y un claim {@code exp} numerico. No se aceptan codigos de
 * alumno en texto plano, tokens sueltos, cabeceras {@code x-user-id} ni parametros
 * {@code studentId} como fuente de identidad. La verificacion criptografica de la
 * firma se delega a la pasarela institucional; aqui se garantiza la forma y el
 * aislamiento BOLA/IDOR.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SecurityIdentityResolver {

    private static final String BEARER_PREFIX = "Bearer ";

    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Value("${app.jwt.secret:}")
    private String jwtSecret;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.utp.horario.domain.model.repositories.IStudentRepository studentRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.utp.horario.domain.model.repositories.IUtpPortalGateway utpPortalGateway;

    /**
     * Extrae un token Bearer estricto del encabezado Authorization, o {@code null}
     * si el encabezado no cumple el contrato.
     */
    public String extractBearerToken(String authHeader) {
        if (authHeader == null || authHeader.isBlank()) {
            return null;
        }
        String trimmed = authHeader.trim();
        if (!trimmed.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            return null;
        }
        String token = trimmed.substring(BEARER_PREFIX.length()).trim();
        return isStrictJwt(token) ? token : null;
    }

    /**
     * Valida la estructura mínima, algoritmo, expiración y firma de un JWT.
     */
    private boolean isStrictJwt(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3 || parts[0].isBlank() || parts[1].isBlank() || parts[2].isBlank()) {
            return false;
        }
        try {
            // 1. Validar encabezado: algoritmo prohibido 'none'
            byte[] headerBytes = Base64.getUrlDecoder().decode(parts[0]);
            JsonNode header = objectMapper.readTree(headerBytes);
            if (header == null || !header.isObject() || "none".equalsIgnoreCase(header.path("alg").asText(""))) {
                log.warn("[SecurityIdentityResolver] JWT rechazado: algoritmo ausente o 'none'");
                return false;
            }

            // 2. Validar payload y expiración temporal
            byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
            JsonNode payload = objectMapper.readTree(decoded);
            if (payload == null || !payload.isObject()) {
                return false;
            }
            JsonNode exp = payload.get("exp");
            if (exp == null || !exp.isNumber()) {
                return false;
            }
            long expSeconds = exp.asLong();
            long nowSeconds = System.currentTimeMillis() / 1000;
            if (expSeconds <= nowSeconds) {
                log.warn("[SecurityIdentityResolver] JWT expirado: exp={} vs now={}", expSeconds, nowSeconds);
                return false;
            }

            // 3. Verificación de firma simétrica HMAC si hay secreto configurado
            if (jwtSecret != null && !jwtSecret.isBlank() && header.path("alg").asText("").startsWith("HS")) {
                try {
                    io.jsonwebtoken.Jwts.parser()
                            .verifyWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)))
                            .build()
                            .parseSignedClaims(token);
                } catch (Exception sigEx) {
                    log.warn("[SecurityIdentityResolver] Firma HMAC JWT inválida: {}", sigEx.getMessage());
                    return false;
                }
            }

            return true;
        } catch (Exception e) {
            log.debug("[SecurityIdentityResolver] JWT rechazado por estructura invalida: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Extrae el codigo de estudiante de los claims del JWT. Solo se consideran
     * {@code preferred_username} y {@code sub}; se elimino el escaneo regex de todo
     * el payload que permitia fabricar una identidad con cualquier claim.
     */
    public String extractStudentCodeFromToken(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        String clean = token.trim();
        if (clean.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            clean = clean.substring(BEARER_PREFIX.length()).trim();
        }
        String jwt = extractBearerToken(BEARER_PREFIX + clean);
        if (jwt == null) {
            return null;
        }
        try {
            String[] parts = jwt.split("\\.");
            byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
            JsonNode root = objectMapper.readTree(decoded);
            if (root == null || !root.isObject()) {
                return null;
            }
            for (String field : new String[]{"preferred_username", "sub"}) {
                JsonNode node = root.get(field);
                if (node == null || !node.isValueNode() || node.asText().isBlank()) {
                    continue;
                }
                String value = node.asText().trim();
                if (value.contains("@")) {
                    value = value.substring(0, value.indexOf('@')).trim();
                }
                if (value.matches("(?i)^[uU]\\d{8}$")) {
                    return value.toUpperCase();
                }
            }
        } catch (Exception e) {
            log.debug("[SecurityIdentityResolver] No se pudieron leer los claims del JWT: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Resuelve de forma autoritativa el codigo del estudiante. El token manda:
     * cualquier parametro distinto se considera un intento BOLA/IDOR.
     */
    public String resolveStudentCode(String authHeader, String xUserIdHeader, String paramStudentId) {
        String token = extractBearerToken(authHeader);
        if (token == null) {
            throw new SecurityException(
                    "Acceso no autorizado: se requiere Authorization: Bearer <JWT> con expiracion valida.");
        }
        String tokenStudentCode = extractStudentCodeFromToken(token);
        if (tokenStudentCode == null || tokenStudentCode.isBlank()) {
            throw new SecurityException(
                    "Acceso no autorizado: el token no expone una identidad de estudiante valida.");
        }
        if (paramStudentId != null && !paramStudentId.isBlank()
                && !paramStudentId.equalsIgnoreCase(tokenStudentCode)
                && !"current-student".equalsIgnoreCase(paramStudentId)) {
            log.warn("[SecurityIdentityResolver] Intento BOLA/IDOR bloqueado: token [{}] vs solicitado [{}]",
                    tokenStudentCode, paramStudentId);
            throw new SecurityException(
                    "Acceso prohibido (403): intento de consulta cruzada no autorizada al recurso del estudiante ["
                            + paramStudentId + "].");
        }

        if (studentRepository != null) {
            java.util.Optional<com.utp.horario.domain.model.aggregate.StudentProfile> existing = studentRepository.findByStudentCode(tokenStudentCode);
            if (existing.isEmpty() && utpPortalGateway != null) {
                try {
                    utpPortalGateway.fetchCoursesSummary(token);
                } catch (Exception ex) {
                    log.warn("[SecurityIdentityResolver] Rechazo BOLA: el token para [{}] no fue validado por la pasarela institucional: {}",
                            tokenStudentCode, ex.getMessage());
                    throw new SecurityException("Acceso no autorizado: la identidad del token no pudo ser verificada por la pasarela institucional.");
                }
            }
        }

        return tokenStudentCode;
    }

    public String resolveStudentCode(String authHeader, String paramStudentId) {
        return resolveStudentCode(authHeader, null, paramStudentId);
    }
}
