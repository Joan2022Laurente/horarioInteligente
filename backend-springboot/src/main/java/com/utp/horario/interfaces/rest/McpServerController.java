package com.utp.horario.interfaces.rest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;
import com.utp.horario.application.service.tool.AcademicToolDispatcher;
import com.utp.horario.application.service.tool.AcademicToolRegistry;
import com.utp.horario.application.service.tool.AcademicToolService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import jakarta.servlet.http.HttpServletRequest;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servidor MCP (Model Context Protocol) sobre HTTP / SSE con transporte JSON-RPC 2.0.
 * <p>
 * Permite que IAs externas (Claude Desktop, MCP Inspector, Cursor, ChatGPT Actions) consuman
 * las herramientas académicas del estudiante de forma segura y remota.
 * <p>
 * <b>Contrato de resiliencia asumido por este controlador:</b>
 * <ul>
 *   <li>El canal HTTP responde siempre {@code 200 OK} con un envelope JSON-RPC válido, salvo el
 *       rechazo de autenticación explícito ({@code 401}) que el propio contrato de seguridad exige.</li>
 *   <li>Nunca se propaga una excepción no controlada: todo fallo degenera en un error JSON-RPC
 *       ({@code -32603}) o en un resultado con {@code isError: true}.</li>
 *   <li>Nunca se sintetizan datos: si el estudiante no tiene registro persistido, la respuesta es
 *       un mensaje informativo explícito, no un conjunto vacío ni un dato inventado.</li>
 * </ul>
 */
@Tag(name = "07. Copiloto IA & MCP", description = "Servidor Model Context Protocol (JSON-RPC 2.0 y SSE)")
@Slf4j
@RestController
@RequestMapping({"/mcp", "/api/v1/mcp"})
@RequiredArgsConstructor
public class McpServerController {

    /** Versión del protocolo Model Context Protocol negociada en el handshake. */
    static final String PROTOCOL_VERSION = "2024-11-05";

    /** Identificador público del servidor MCP. */
    static final String SERVER_NAME = "horario-inteligente-mcp";

    /** Versión semántica del servidor MCP. */
    static final String SERVER_VERSION = "1.0.0";

    /** Códigos de error JSON-RPC 2.0 utilizados por el servidor. */
    private static final int PARSE_ERROR = -32700;
    private static final int INVALID_REQUEST = -32600;
    private static final int METHOD_NOT_FOUND = -32601;
    private static final int INTERNAL_ERROR = -32603;
    private static final int AUTH_REQUIRED = -32000;
    private static final int STUDENT_NOT_PERSISTED = -32002;

    private final AcademicToolService toolService;
    private final ObjectMapper objectMapper;
    private final com.utp.horario.infrastructure.security.SecurityIdentityResolver identityResolver;
    private final AcademicToolDispatcher toolDispatcher;

    /**
     * Tiempo máximo de vida de una sesión SSE. Acota la ventana de exposición de los emisores y
     * garantiza que las sesiones abandonadas se liberen en lugar de acumularse en memoria.
     */
    @Value("${app.mcp.session-timeout-ms:1800000}")
    private long sessionTimeoutMs = 1_800_000L;

    /**
     * Tope de sesiones SSE simultáneas. Al superarlo se evicta la más antigua para impedir el
     * agotamiento de memoria del dyno durante una demostración prolongada.
     */
    @Value("${app.mcp.max-sessions:50}")
    private int maxSessions = 50;

    /**
     * Sesión MCP activa. El {@code createdAt} permite ordenar por antigüedad para la evicción.
     */
    public record McpSession(
            String sessionId,
            String studentCode,
            SseEmitter emitter,
            long createdAt
    ) {}

    private record ToolOutcome(String json, boolean isError) {
        static ToolOutcome error(String json) {
            return new ToolOutcome(json, true);
        }
    }

    private final Map<String, McpSession> activeSessions = new ConcurrentHashMap<>();

    /**
     * Endpoint informativo para verificación rápida desde el navegador o tests HTTP.
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getMcpInfo() {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("name", SERVER_NAME);
        info.put("version", SERVER_VERSION);
        info.put("protocolVersion", PROTOCOL_VERSION);
        info.put("transport", "streamable-http,sse");
        info.put("tools", AcademicToolRegistry.getSupportedToolNames());
        info.put("authRequired", true);
        info.put("authType", "OAuth 2.1 / Bearer");
        info.put("streamableEndpoint", "/mcp");
        info.put("sseEndpoint", "/mcp/sse");
        info.put("messageEndpoint", "/mcp/message");
        info.put("activeSessions", activeSessions.size());
        return ResponseEntity.ok(info);
    }

    /**
     * 1. Handshake SSE: Gemini o cualquier cliente MCP remoto se conecta a esta URL.
     * Requiere autenticación mediante Authorization: Bearer <JWT>. No se aceptan
     * identidades por query param ni registros persistidos como sustituto del token.
     * La identidad del estudiante queda blindada e inmutable para toda la duración de la sesión.
     */
    @GetMapping(value = "/sse", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter handleSseConnection(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        String resolvedStudentCode;
        try {
            resolvedStudentCode = identityResolver.resolveStudentCode(authHeader, null);
        } catch (Exception ex) {
            log.warn("[MCP-SSE] Conexión rechazada: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Acceso no autorizado: se requiere Authorization: Bearer <JWT> de sesión UTP.");
        }
        final String authenticatedStudentCode = resolvedStudentCode;

        String sessionId = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(sessionTimeoutMs);
        long createdAt = System.currentTimeMillis();

        evictOldestSessionsIfNeeded();

        activeSessions.put(sessionId, new McpSession(sessionId, authenticatedStudentCode, emitter, createdAt));
        emitter.onCompletion(() -> activeSessions.remove(sessionId));
        emitter.onTimeout(() -> {
            activeSessions.remove(sessionId);
            safeComplete(emitter);
        });
        emitter.onError(e -> activeSessions.remove(sessionId));

        try {
            emitter.send(SseEmitter.event()
                    .name("endpoint")
                    .data("/mcp/message?sessionId=" + sessionId));
            log.info("[MCP-SSE] Sesión autenticada para [{}] -> {}", authenticatedStudentCode, sessionId);
        } catch (IOException | IllegalStateException e) {
            activeSessions.remove(sessionId);
            emitter.completeWithError(e);
        }
        return emitter;
    }

    /**
     * 2. Recepción de mensajes JSON-RPC 2.0 desde el cliente MCP (Claude Desktop / MCP Inspector / Cursor).
     * Procesa la solicitud y devuelve la respuesta JSON-RPC en el cuerpo HTTP.
     */
    public ResponseEntity<Map<String, Object>> handleJsonRpcMessage(
            String sessionId,
            String authHeader,
            JsonNode request) {
        return handleJsonRpcMessage(sessionId, authHeader, request, null);
    }

    @PostMapping(value = {"/message", "/sse", ""}, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> handleJsonRpcMessage(
            @RequestParam(required = false) String sessionId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) JsonNode request,
            HttpServletRequest httpRequest) {

        Map<String, Object> rpcResponse = new LinkedHashMap<>();
        rpcResponse.put("jsonrpc", "2.0");

        boolean notification = false;
        String studentCode = null;

        try {
            // ── Validación de estructura JSON-RPC 2.0 ─────────────────────────────────────────
            if (request != null && request.isArray()) {
                rpcResponse.put("id", NullNode.getInstance());
                rpcResponse.put("error", jsonRpcError(INVALID_REQUEST,
                        "Invalid Request: solicitudes en batch no soportadas."));
                return ResponseEntity.ok(rpcResponse);
            }

            if (request == null || request.isNull() || request.isMissingNode() || !request.isObject()) {
                rpcResponse.put("id", NullNode.getInstance());
                rpcResponse.put("error", jsonRpcError(PARSE_ERROR,
                        "Parse error: el cuerpo de la solicitud JSON-RPC está vacío o no es un objeto JSON válido."));
                return ResponseEntity.ok(rpcResponse);
            }

            // ── Envelope JSON-RPC: el id de la solicitud se refleja exactamente ──────────────
            // Un id ausente identifica una notificacion (sin respuesta). Un id presente y nulo
            // es una peticion legitima y debe reflejarse como "id": null en la respuesta.
            boolean idPresent = request.has("id");
            JsonNode idNode = idPresent ? request.get("id") : null;
            if (idPresent) {
                rpcResponse.put("id", idNode == null ? NullNode.getInstance() : idNode);
            } else {
                rpcResponse.put("id", NullNode.getInstance());
            }
            notification = !idPresent;

            // Validación estricta de versión de protocolo JSON-RPC 2.0
            if (!"2.0".equals(request.path("jsonrpc").asText(""))) {
                rpcResponse.put("error", jsonRpcError(INVALID_REQUEST,
                        "Invalid Request: el campo 'jsonrpc' debe ser exactamente '2.0'."));
                return ResponseEntity.ok(rpcResponse);
            }

            // ── Resolución de identidad: solo Bearer; la sesión no basta ──────────────
            try {
                String authenticatedStudentCode = identityResolver.resolveStudentCode(authHeader, null);
                if (sessionId != null && !sessionId.isBlank()) {
                    McpSession session = activeSessions.get(sessionId);
                    if (session == null) {
                        rpcResponse.put("error", jsonRpcError(AUTH_REQUIRED,
                                "Sesión MCP inexistente; realice el handshake /mcp/sse con Bearer."));
                        return ResponseEntity.ok(rpcResponse);
                    }
                    if (!session.studentCode().equalsIgnoreCase(authenticatedStudentCode)) {
                        rpcResponse.put("error", jsonRpcError(AUTH_REQUIRED,
                                "La identidad del token no coincide con la sesión MCP."));
                        return ResponseEntity.ok(rpcResponse);
                    }
                }
                studentCode = authenticatedStudentCode;
            } catch (Exception ex) {
                rpcResponse.put("error", jsonRpcError(AUTH_REQUIRED,
                        "Acceso no autorizado: se requiere Authorization: Bearer <JWT> de sesión UTP."));
                // En Streamable HTTP moderno (petición a /mcp o /api/v1/mcp directamente sin /message), devolver 401 + WWW-Authenticate para Discovery OAuth 2.1
                if (sessionId == null && httpRequest != null && !httpRequest.getRequestURI().endsWith("/message")) {
                    String baseUrl = resolveBaseUrl(httpRequest);
                    HttpHeaders headers = new HttpHeaders();
                    headers.set("WWW-Authenticate", "Bearer resource_metadata=\"" + baseUrl + "/.well-known/oauth-protected-resource\"");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).headers(headers).body(rpcResponse);
                }
                // En tests directos o canal legado /message, preservar 200 OK con envelope JSON-RPC de error
                return ResponseEntity.ok(rpcResponse);
            }

            String method = request.path("method").asText("");
            log.info("[MCP-JSONRPC] Método recibido: {} (ID: {}) para estudiante [{}]", method, idNode, studentCode);

            // ── Despacho del método ─────────────────────────────────────────────────────────
            if (method.isBlank()) {
                rpcResponse.put("error", jsonRpcError(INVALID_REQUEST, "Invalid Request: falta el campo 'method'."));
            } else if (method.startsWith("notifications/")) {
                // Notificacion: se procesa limpiamente. Si el cliente incluyo un 'id', la
                // peticion es una request y debe recibir un envelope de respuesta vacio.
                log.info("[MCP-JSONRPC] Notificación procesada: {} (id presente: {})", method, idPresent);
                if (idPresent) {
                    rpcResponse.put("result", Map.of());
                } else {
                    notification = true;
                }
            } else {
                switch (method) {
                    case "initialize" -> rpcResponse.put("result", initializeResult());

                    case "ping" -> rpcResponse.put("result", Map.of());

                    case "tools/list" -> rpcResponse.put("result", Map.of("tools", buildToolCatalogue()));

                    case "tools/call" -> {
                        String toolName = request.at("/params/name").asText("");
                        JsonNode arguments = request.at("/params/arguments");
                        if (arguments == null || arguments.isNull() || !arguments.isObject()) {
                            arguments = objectMapper.createObjectNode();
                        }
                        log.info("[MCP-JSONRPC] Invocación de tool: {} con argumentos: {} para estudiante [{}]",
                                toolName, arguments, studentCode);

                        ToolOutcome outcome = executeTool(toolName, arguments, studentCode);
                        rpcResponse.put("result", Map.of(
                                "content", List.of(Map.of("type", "text", "text", outcome.json())),
                                "isError", outcome.isError()
                        ));
                    }

                    default -> {
                        log.warn("[MCP-JSONRPC] Método desconocido: {}", method);
                        rpcResponse.put("error", jsonRpcError(METHOD_NOT_FOUND, "Method not found: " + method));
                    }
                }
            }
        } catch (Exception ex) {
            // Red de seguridad global: el canal HTTP nunca debe propagar un 500.
            log.error("[MCP-JSONRPC] Error inesperado procesando la petición JSON-RPC: {}", ex.getMessage(), ex);
            rpcResponse.put("error", jsonRpcError(INTERNAL_ERROR,
                    "Internal error: " + safeMessage(ex)));
        }

        if (notification) {
            // Notificaciones JSON-RPC: respuesta vacía con código 200.
            return ResponseEntity.ok().build();
        }

        // Retornar 200 OK con el cuerpo JSON-RPC (especificación MCP 2024-11-05)
        return ResponseEntity.ok(rpcResponse);
    }

    /**
     * Manejador local de cuerpos JSON-RPC ilegibles.
     *
     * <p>Spring aborta el despacho antes de invocar el controlador cuando el cuerpo no puede
     * deserializarse. Sin este manejador, la excepcion escalaria al advice global y el cliente
     * MCP recibiria un HTTP 400 con un envelope ajeno al protocolo. Aqui se degrada a un
     * {@code -32700 Parse error} dentro de un envelope JSON-RPC valido y HTTP 200.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableJsonRpcBody(HttpMessageNotReadableException ex) {
        log.warn("[MCP-JSONRPC] Cuerpo JSON-RPC ilegible: {}", ex.getMessage());
        Map<String, Object> rpcResponse = new LinkedHashMap<>();
        rpcResponse.put("jsonrpc", "2.0");
        rpcResponse.put("id", NullNode.getInstance());
        rpcResponse.put("error", jsonRpcError(PARSE_ERROR,
                "Parse error: el cuerpo de la solicitud JSON-RPC no es un JSON valido."));
        return ResponseEntity.ok(rpcResponse);
    }

    /**
     * Manejador local de Content-Type no soportado.
     * Garantiza que el cliente reciba siempre un envelope JSON-RPC válido con HTTP 200.
     */
    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleUnsupportedMediaType(org.springframework.web.HttpMediaTypeNotSupportedException ex) {
        log.warn("[MCP-JSONRPC] Content-Type no soportado: {}", ex.getMessage());
        Map<String, Object> rpcResponse = new LinkedHashMap<>();
        rpcResponse.put("jsonrpc", "2.0");
        rpcResponse.put("id", NullNode.getInstance());
        rpcResponse.put("error", jsonRpcError(INVALID_REQUEST,
                "Invalid Request: se requiere Content-Type application/json."));
        return ResponseEntity.ok(rpcResponse);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Construcción de respuestas
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Resultado del handshake {@code initialize} conforme a la especificación MCP.
     */
    private Map<String, Object> initializeResult() {
        Map<String, Object> serverInfo = new LinkedHashMap<>();
        serverInfo.put("name", SERVER_NAME);
        serverInfo.put("version", SERVER_VERSION);

        Map<String, Object> toolsCapability = new LinkedHashMap<>();
        toolsCapability.put("listChanged", false);

        Map<String, Object> capabilities = new LinkedHashMap<>();
        capabilities.put("tools", toolsCapability);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("protocolVersion", PROTOCOL_VERSION);
        result.put("capabilities", capabilities);
        result.put("serverInfo", serverInfo);
        return result;
    }

    /**
     * Catálogo de herramientas publicado en {@code tools/list}. Se construye con mapas enlazados
     * para tolerar definiciones incompletas sin provocar un NullPointerException.
     */
    private List<Map<String, Object>> buildToolCatalogue() {
        List<Map<String, Object>> tools = new ArrayList<>();
        for (Map<String, Object> toolDef : AcademicToolRegistry.getOpenAiToolDefinitions()) {
            Object function = toolDef.get("function");
            if (!(function instanceof Map<?, ?> functionMap)) {
                log.warn("[MCP-JSONRPC] Definición de herramienta incompleta, se omite: {}", toolDef);
                continue;
            }
            Map<String, Object> tool = new LinkedHashMap<>();
            tool.put("name", functionMap.get("name"));
            tool.put("description", functionMap.get("description"));
            tool.put("inputSchema", functionMap.get("parameters"));
            tools.add(tool);
        }
        log.info("[MCP-JSONRPC] Listando {} herramientas a cliente MCP.", tools.size());
        return tools;
    }

    /**
     * Delegación al despachador unificado de herramientas (Fase 0.6): el mismo motor de
     * validación y ejecución sirve tanto al chat web como al servidor MCP.
     */
    private ToolOutcome executeTool(String toolName, JsonNode arguments, String studentCode) {
        AcademicToolDispatcher.ToolExecution execution =
                toolDispatcher.dispatch(toolName, arguments, studentCode);
        return new ToolOutcome(execution.json(), execution.isError());
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Utilidades de soporte
    // ─────────────────────────────────────────────────────────────────────────────

    private Map<String, Object> jsonRpcError(int code, String message) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("code", code);
        error.put("message", message);
        return error;
    }

    /**
     * Evicta la sesión más antigua cuando se supera el tope de sesiones simultáneas.
     * Sincronizado atómicamente para prevenir carreras en accesos concurrentes.
     */
    private void evictOldestSessionsIfNeeded() {
        synchronized (activeSessions) {
            while (activeSessions.size() >= maxSessions) {
                activeSessions.entrySet().stream()
                        .min(Map.Entry.comparingByValue(java.util.Comparator.comparingLong(McpSession::createdAt)))
                        .ifPresent(oldest -> {
                            log.warn("[MCP-SSE] Tope de sesiones alcanzado ({}). Evictando la sesión más antigua: {}",
                                    maxSessions, oldest.getKey());
                            activeSessions.remove(oldest.getKey());
                            safeComplete(oldest.getValue().emitter());
                        });
            }
        }
    }

    private void safeComplete(SseEmitter emitter) {
        try {
            emitter.complete();
        } catch (Exception e) {
            log.debug("[MCP-SSE] El emisor ya estaba finalizado: {}", e.getMessage());
        }
    }

    private String safeMessage(Exception ex) {
        String message = ex.getMessage();
        return (message == null || message.isBlank()) ? ex.getClass().getSimpleName() : message;
    }

    private String resolveBaseUrl(HttpServletRequest request) {
        if (request == null) {
            return "https://horario-inteligente-utp-31065a33a7ec.herokuapp.com";
        }
        return ServletUriComponentsBuilder.fromContextPath(request).build().toUriString();
    }
}
