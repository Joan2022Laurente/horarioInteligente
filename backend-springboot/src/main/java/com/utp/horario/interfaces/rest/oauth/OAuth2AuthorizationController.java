package com.utp.horario.interfaces.rest.oauth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.command.AuthenticateStudentCommand;
import com.utp.horario.application.handle.AuthenticateStudentCommandHandler;
import com.utp.horario.domain.model.aggregate.StudentProfile;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Controlador de Autorización OAuth 2.1 con PKCE (RFC 6749, RFC 7636, RFC 7591).
 * Implementación optimizada para dynos Eco de Heroku: stateless, bajo consumo de heap y
 * compatible con Claude Web (claude.ai) y ChatGPT Web (chatgpt.com).
 */
@Slf4j
@RestController
@RequestMapping("/oauth")
public class OAuth2AuthorizationController {

    private final AuthenticateStudentCommandHandler authCommandHandler;
    private final String jwtSecret;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SecureRandom secureRandom = new SecureRandom();

    public record RegisteredClient(
            String clientId,
            String clientSecret,
            List<String> redirectUris,
            String clientName,
            long issuedAt
    ) {}

    public record AuthCodeRecord(
            String code,
            String studentCode,
            String clientId,
            String redirectUri,
            String codeChallenge,
            String codeChallengeMethod,
            long expiresAt
    ) {}

    // Almacenamiento en memoria para clientes y codigos temporales (60s de vida)
    private final Map<String, RegisteredClient> registeredClients = new ConcurrentHashMap<>();
    private final Map<String, AuthCodeRecord> pendingCodes = new ConcurrentHashMap<>();

    public OAuth2AuthorizationController(
            AuthenticateStudentCommandHandler authCommandHandler,
            @Value("${app.jwt.secret:utp-horario-inteligente-jwt-secret-key-super-secure-32b}") String jwtSecret) {
        this.authCommandHandler = authCommandHandler;
        this.jwtSecret = jwtSecret;

        // Clientes conocidos preconfigurados por compatibilidad inmediata
        seedDefaultClients();
    }

    private void seedDefaultClients() {
        long now = System.currentTimeMillis();
        registeredClients.put("claude-web", new RegisteredClient(
                "claude-web",
                null,
                List.of("https://claude.ai/api/mcp/auth_callback", "https://claude.com/api/mcp/auth_callback"),
                "Claude Web Connector",
                now
        ));
        registeredClients.put("chatgpt-web", new RegisteredClient(
                "chatgpt-web",
                null,
                List.of("https://chatgpt.com/connector/oauth/*", "https://chatgpt.com/connector_platform_oauth_redirect"),
                "ChatGPT Web Connector",
                now
        ));
        registeredClients.put("gemini-web", new RegisteredClient(
                "gemini-web",
                null,
                List.of("https://oauth-redirect.googleusercontent.com/*", "https://oauth-redirect-sandbox.googleusercontent.com/*", "https://gemini.google.com/*"),
                "Google Gemini Web Connector",
                now
        ));
    }

    /**
     * RFC 7591: Dynamic Client Registration (DCR).
     * Permite que Claude, ChatGPT y Gemini registren clientes de forma dinámica.
     */
    @PostMapping(value = "/register", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> registerClient(@RequestBody JsonNode body) {
        List<String> requestedUris = new ArrayList<>();
        if (body.has("redirect_uris") && body.get("redirect_uris").isArray()) {
            body.get("redirect_uris").forEach(node -> requestedUris.add(node.asText().trim()));
        }

        if (requestedUris.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "invalid_redirect_uri", "error_description", "redirect_uris es requerido"));
        }

        // Validar allowlist de seguridad
        for (String uri : requestedUris) {
            if (!isAllowedRedirectUri(uri)) {
                log.warn("[OAuth-DCR] Intento de registro con redirect_uri no permitida: {}", uri);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "error", "invalid_redirect_uri",
                        "error_description", "La redirect_uri [" + uri + "] no pertenece a la allowlist autorizada (claude.ai, chatgpt.com, googleusercontent.com o localhost)."
                ));
            }
        }

        String clientId = "client_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String clientName = body.path("client_name").asText("MCP Client " + clientId);
        long now = System.currentTimeMillis();

        RegisteredClient client = new RegisteredClient(clientId, null, requestedUris, clientName, now);
        registeredClients.put(clientId, client);

        log.info("[OAuth-DCR] Cliente registrado exitosamente: id={}, name={}", clientId, clientName);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("client_id", clientId);
        response.put("client_name", clientName);
        response.put("redirect_uris", requestedUris);
        response.put("grant_types", List.of("authorization_code", "refresh_token"));
        response.put("response_types", List.of("code"));
        response.put("token_endpoint_auth_method", "none");
        response.put("client_id_issued_at", now / 1000);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * RFC 6749 / RFC 7636: Endpoint de Autorización (GET: pantalla de login/consentimiento).
     */
    @GetMapping(value = "/authorize", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> renderAuthorizePage(
            @RequestParam("response_type") String responseType,
            @RequestParam("client_id") String clientId,
            @RequestParam("redirect_uri") String redirectUri,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "code_challenge", required = false) String codeChallenge,
            @RequestParam(value = "code_challenge_method", defaultValue = "S256") String codeChallengeMethod,
            @RequestParam(value = "resource", required = false) String resource) {

        if (!"code".equals(responseType)) {
            return ResponseEntity.badRequest().body("<h3>Error: response_type debe ser 'code'</h3>");
        }

        if (!isAllowedRedirectUri(redirectUri)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("<h3>Error: redirect_uri no autorizada</h3>");
        }

        // Renderizar formulario de login institucional seguro en HTML
        String html = buildLoginFormHtml(clientId, redirectUri, state, codeChallenge, codeChallengeMethod, resource, null);
        return ResponseEntity.ok(html);
    }

    /**
     * RFC 6749 / RFC 7636: Procesamiento de Login y Consentimiento (POST).
     * Autentica con el portal institucional y emite un código de autorización temporal (60s).
     */
    @PostMapping(value = "/authorize", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<?> processAuthorization(
            @RequestParam("username") String username,
            @RequestParam("password") String password,
            @RequestParam("client_id") String clientId,
            @RequestParam("redirect_uri") String redirectUri,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "code_challenge", required = false) String codeChallenge,
            @RequestParam(value = "code_challenge_method", defaultValue = "S256") String codeChallengeMethod,
            @RequestParam(value = "resource", required = false) String resource,
            HttpServletRequest request) {

        if (!isAllowedRedirectUri(redirectUri)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("redirect_uri no autorizada");
        }

        StudentProfile profile;
        try {
            profile = authCommandHandler.handle(new AuthenticateStudentCommand(username.trim(), password));
        } catch (Exception ex) {
            log.warn("[OAuth-Authorize] Credenciales incorrectas para usuario {}: {}", username, ex.getMessage());
            String errorHtml = buildLoginFormHtml(clientId, redirectUri, state, codeChallenge, codeChallengeMethod, resource,
                    "Credenciales institucionales incorrectas. Verifica tu código de estudiante o contraseña UTP.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorHtml);
        }

        String studentCode = profile.getStudentCode();
        if (studentCode == null || studentCode.isBlank()) {
            studentCode = username.trim().toUpperCase();
        }

        // Generar código de un solo uso con 60 segundos de expiración
        String code = "auth_" + UUID.randomUUID().toString().replace("-", "") + System.currentTimeMillis();
        long expiresAt = System.currentTimeMillis() + 60_000;

        cleanExpiredCodes();
        pendingCodes.put(code, new AuthCodeRecord(code, studentCode, clientId, redirectUri, codeChallenge, codeChallengeMethod, expiresAt));
        log.info("[OAuth-Authorize] Código de autorización emitido para [{}] hacia [{}]", studentCode, redirectUri);

        // Construir URL de redirección con code, state e iss (RFC 9207)
        String baseUrl = resolveBaseUrl(request);
        StringBuilder redirectBuilder = new StringBuilder(redirectUri);
        redirectBuilder.append(redirectUri.contains("?") ? "&" : "?");
        redirectBuilder.append("code=").append(code);
        if (state != null && !state.isBlank()) {
            redirectBuilder.append("&state=").append(state);
        }
        redirectBuilder.append("&iss=").append(baseUrl);

        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, redirectBuilder.toString())
                .build();
    }

    /**
     * RFC 6749 / RFC 7636: Endpoint de Emisión de Tokens (POST /oauth/token).
     * Intercambia el código de autorización y valida PKCE S256 para emitir el JWT de acceso.
     */
    @PostMapping(value = "/token", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> exchangeToken(
            @RequestParam("grant_type") String grantType,
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "redirect_uri", required = false) String redirectUri,
            @RequestParam(value = "code_verifier", required = false) String codeVerifier,
            @RequestParam(value = "refresh_token", required = false) String refreshToken,
            HttpServletRequest request) {

        String baseUrl = resolveBaseUrl(request);

        if ("authorization_code".equalsIgnoreCase(grantType)) {
            if (code == null || code.isBlank()) {
                return ResponseEntity.badRequest().body(oauthError("invalid_request", "Parámetro 'code' requerido"));
            }

            // Consumo estricto de un solo uso (eliminar inmediatamente)
            AuthCodeRecord record = pendingCodes.remove(code);
            if (record == null || System.currentTimeMillis() > record.expiresAt()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(oauthError("invalid_grant", "Código de autorización inválido o expirado"));
            }

            // Validar coincidencia de redirect_uri si fue provista
            if (redirectUri != null && !redirectUri.isBlank() && !redirectUri.equals(record.redirectUri())) {
                return ResponseEntity.badRequest().body(oauthError("invalid_grant", "redirect_uri no coincide con la registrada"));
            }

            // Validar PKCE si se registró un challenge
            if (record.codeChallenge() != null && !record.codeChallenge().isBlank()) {
                if (codeVerifier == null || !verifyPkce(codeVerifier, record.codeChallenge())) {
                    log.warn("[OAuth-Token] Falló verificación PKCE para código de [{}]", record.studentCode());
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(oauthError("invalid_grant", "Verificación PKCE (code_verifier) fallida"));
                }
            }

            // Generar Access Token (15 minutos) y Refresh Token (30 días)
            long now = System.currentTimeMillis();
            long accessExpMs = 900_000; // 15 min
            long refreshExpMs = 2_592_000_000L; // 30 días

            String accessToken = buildJwt(record.studentCode(), baseUrl, now, accessExpMs, "access");
            String newRefreshToken = buildJwt(record.studentCode(), baseUrl, now, refreshExpMs, "refresh");

            Map<String, Object> tokenResponse = new LinkedHashMap<>();
            tokenResponse.put("access_token", accessToken);
            tokenResponse.put("token_type", "Bearer");
            tokenResponse.put("expires_in", 900);
            tokenResponse.put("refresh_token", newRefreshToken);
            tokenResponse.put("scope", "mcp:read");

            log.info("[OAuth-Token] Tokens emitidos exitosamente para estudiante [{}]", record.studentCode());
            return ResponseEntity.ok(tokenResponse);

        } else if ("refresh_token".equalsIgnoreCase(grantType)) {
            if (refreshToken == null || refreshToken.isBlank()) {
                return ResponseEntity.badRequest().body(oauthError("invalid_request", "Parámetro 'refresh_token' requerido"));
            }

            String studentCode = parseAndValidateRefreshToken(refreshToken);
            if (studentCode == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(oauthError("invalid_grant", "Refresh token inválido o expirado"));
            }

            long now = System.currentTimeMillis();
            String accessToken = buildJwt(studentCode, baseUrl, now, 900_000, "access");
            String rotatedRefreshToken = buildJwt(studentCode, baseUrl, now, 2_592_000_000L, "refresh");

            Map<String, Object> tokenResponse = new LinkedHashMap<>();
            tokenResponse.put("access_token", accessToken);
            tokenResponse.put("token_type", "Bearer");
            tokenResponse.put("expires_in", 900);
            tokenResponse.put("refresh_token", rotatedRefreshToken);
            tokenResponse.put("scope", "mcp:read");

            return ResponseEntity.ok(tokenResponse);
        }

        return ResponseEntity.badRequest().body(oauthError("unsupported_grant_type", "grant_type no soportado: " + grantType));
    }

    private boolean isAllowedRedirectUri(String uri) {
        if (uri == null || uri.isBlank()) return false;
        String lower = uri.toLowerCase();
        return lower.startsWith("https://claude.ai/api/mcp/auth_callback")
                || lower.startsWith("https://claude.com/api/mcp/auth_callback")
                || lower.startsWith("https://chatgpt.com/connector/oauth/")
                || lower.startsWith("https://chatgpt.com/connector_platform_oauth_redirect")
                || (lower.startsWith("https://") && lower.contains(".googleusercontent.com/"))
                || lower.startsWith("https://gemini.google.com/")
                || lower.startsWith("http://localhost:")
                || lower.startsWith("http://127.0.0.1:")
                || lower.contains(".trycloudflare.com");
    }

    private boolean verifyPkce(String codeVerifier, String codeChallenge) {
        try {
            byte[] bytes = codeVerifier.getBytes(StandardCharsets.US_ASCII);
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(bytes);
            String calculated = Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
            return MessageDigest.isEqual(calculated.getBytes(StandardCharsets.UTF_8), codeChallenge.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("[OAuth-PKCE] Error al verificar PKCE: {}", e.getMessage());
            return false;
        }
    }

    private String buildJwt(String studentCode, String baseUrl, long now, long durationMs, String type) {
        SecretKey key = getSigningKey();
        return Jwts.builder()
                .subject(studentCode)
                .claim("studentCode", studentCode)
                .claim("preferred_username", studentCode)
                .claim("token_type", type)
                .issuer(baseUrl)
                .audience().add(baseUrl + "/mcp").and()
                .issuedAt(new Date(now))
                .expiration(new Date(now + durationMs))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    private String parseAndValidateRefreshToken(String token) {
        try {
            SecretKey key = getSigningKey();
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if (!"refresh".equals(claims.get("token_type", String.class))) {
                return null;
            }
            return claims.getSubject();
        } catch (Exception ex) {
            log.warn("[OAuth-Refresh] Error validando refresh token: {}", ex.getMessage());
            return null;
        }
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes;
        if (jwtSecret != null && jwtSecret.getBytes(StandardCharsets.UTF_8).length >= 32) {
            keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        } else {
            try {
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                String fallback = (jwtSecret != null && !jwtSecret.isBlank()) ? jwtSecret : "utp-horario-default-secret-key-32b-min!";
                keyBytes = md.digest(fallback.getBytes(StandardCharsets.UTF_8));
            } catch (Exception e) {
                keyBytes = "utp-horario-default-secret-key-32b-min!".getBytes(StandardCharsets.UTF_8);
            }
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private void cleanExpiredCodes() {
        long now = System.currentTimeMillis();
        pendingCodes.entrySet().removeIf(entry -> entry.getValue().expiresAt() < now);
    }

    private String resolveBaseUrl(HttpServletRequest request) {
        return ServletUriComponentsBuilder.fromContextPath(request).build().toUriString();
    }

    private Map<String, Object> oauthError(String error, String description) {
        Map<String, Object> err = new LinkedHashMap<>();
        err.put("error", error);
        err.put("error_description", description);
        return err;
    }

    private String buildLoginFormHtml(
            String clientId, String redirectUri, String state,
            String codeChallenge, String codeChallengeMethod, String resource,
            String errorMessage) {

        String errorBlock = errorMessage != null ? String.format(
                "<div class='error-box'>%s</div>",
                errorMessage
        ) : "";

        return String.format("""
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>utopik. &middot; Acceso IA</title>
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                body {
                  background: #090a0c;
                  color: #f4f4f5;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  padding: 24px;
                }
                .wrap {
                  width: 100%%;
                  max-width: 420px;
                  text-align: center;
                }
                .brand {
                  margin-bottom: 8px;
                }
                h1.logo {
                  font-size: 48px;
                  font-weight: 900;
                  letter-spacing: -0.04em;
                  color: #f4f4f6;
                  line-height: 1;
                }
                h1.logo span {
                  color: #bbf451;
                }
                p.sub {
                  font-size: 13.5px;
                  color: #a1a1aa;
                  margin-top: 8px;
                  font-weight: 500;
                }
                .ai-pill {
                  display: inline-flex;
                  align-items: center;
                  gap: 8px;
                  margin-top: 14px;
                  margin-bottom: 28px;
                  padding: 5px 14px;
                  border-radius: 9999px;
                  background: rgba(187, 244, 81, 0.08);
                  border: 1px solid rgba(187, 244, 81, 0.28);
                  color: #bbf451;
                  font-size: 11px;
                  font-weight: 700;
                  letter-spacing: 0.05em;
                  text-transform: uppercase;
                }
                .ai-dot {
                  width: 6px;
                  height: 6px;
                  border-radius: 50%%;
                  background: #bbf451;
                }
                .error-box {
                  background: rgba(239, 68, 68, 0.12);
                  border: 1px solid rgba(239, 68, 68, 0.3);
                  color: #fca5a5;
                  padding: 12px 14px;
                  border-radius: 10px;
                  font-size: 12.5px;
                  text-align: left;
                  margin-bottom: 20px;
                  font-weight: 500;
                }
                form {
                  text-align: left;
                }
                .field {
                  margin-bottom: 18px;
                }
                label {
                  display: block;
                  font-size: 11px;
                  font-weight: 700;
                  color: #e4e4e7;
                  letter-spacing: 0.05em;
                  text-transform: uppercase;
                  margin-bottom: 8px;
                }
                .input-wrap {
                  position: relative;
                  width: 100%%;
                }
                input[type="text"], input[type="password"] {
                  width: 100%%;
                  height: 52px;
                  padding: 0 16px;
                  background: #eaf1fb;
                  border: none;
                  border-radius: 10px;
                  color: #090a0c;
                  font-size: 15px;
                  font-weight: 600;
                  outline: none;
                  transition: box-shadow 0.15s ease-out;
                }
                input[type="text"]:focus, input[type="password"]:focus {
                  box-shadow: 0 0 0 2px #bbf451;
                }
                input::placeholder {
                  color: #64748b;
                  font-weight: 400;
                }
                .toggle-btn {
                  position: absolute;
                  right: 14px;
                  top: 50%%;
                  transform: translateY(-50%%);
                  background: none;
                  border: none;
                  color: #64748b;
                  font-size: 12px;
                  font-weight: 700;
                  cursor: pointer;
                  padding: 6px;
                }
                .toggle-btn:hover {
                  color: #090a0c;
                }
                button.submit-btn {
                  width: 100%%;
                  height: 52px;
                  margin-top: 10px;
                  background: #bbf451;
                  color: #090a0c;
                  border: none;
                  border-radius: 10px;
                  font-size: 13.5px;
                  font-weight: 900;
                  letter-spacing: 0.06em;
                  text-transform: uppercase;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                  transition: opacity 0.15s ease-out, transform 0.08s ease-out;
                }
                button.submit-btn:hover {
                  opacity: 0.95;
                }
                button.submit-btn:active {
                  transform: scale(0.98);
                }
                .footer-links {
                  display: flex;
                  justify-content: space-between;
                  margin-top: 32px;
                  font-size: 11.5px;
                  color: #52525b;
                  font-weight: 500;
                }
              </style>
            </head>
            <body>
              <div class="wrap">
                <div class="brand">
                  <h1 class="logo">utopik<span>.</span></h1>
                  <p class="sub">Código institucional y contraseña del portal.</p>
                  <div class="ai-pill">
                    <span class="ai-dot"></span>
                    <span>Conexión Copiloto IA &middot; MCP</span>
                  </div>
                </div>

                %s

                <form method="POST" action="/oauth/authorize">
                  <input type="hidden" name="client_id" value="%s">
                  <input type="hidden" name="redirect_uri" value="%s">
                  <input type="hidden" name="state" value="%s">
                  <input type="hidden" name="code_challenge" value="%s">
                  <input type="hidden" name="code_challenge_method" value="%s">
                  <input type="hidden" name="resource" value="%s">

                  <div class="field">
                    <label for="username">CÓDIGO DE ESTUDIANTE</label>
                    <input type="text" id="username" name="username" placeholder="Ej. U23307609" required autofocus autocomplete="username">
                  </div>

                  <div class="field">
                    <label for="password">CONTRASEÑA</label>
                    <div class="input-wrap">
                      <input type="password" id="password" name="password" placeholder="Tu contraseña del portal" required autocomplete="current-password">
                      <button type="button" class="toggle-btn" id="toggleBtn" onclick="togglePassword()">Ver</button>
                    </div>
                  </div>

                  <button type="submit" class="submit-btn">
                    <span>ACCEDER</span>
                    <span>&rarr;</span>
                  </button>
                </form>

                <div class="footer-links">
                  <span>Políticas &amp; Privacidad</span>
                  <span>utopik</span>
                </div>
              </div>

              <script>
                function togglePassword() {
                  var p = document.getElementById('password');
                  var b = document.getElementById('toggleBtn');
                  if (p.type === 'password') {
                    p.type = 'text';
                    b.textContent = 'Ocultar';
                  } else {
                    p.type = 'password';
                    b.textContent = 'Ver';
                  }
                }
              </script>
            </body>
            </html>
            """,
                errorBlock,
                clientId != null ? clientId : "",
                redirectUri != null ? redirectUri : "",
                state != null ? state : "",
                codeChallenge != null ? codeChallenge : "",
                codeChallengeMethod != null ? codeChallengeMethod : "S256",
                resource != null ? resource : ""
        );
    }
}
