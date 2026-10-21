package com.utp.horario.interfaces.rest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.utp.horario.application.service.tool.AcademicToolRegistry;
import com.utp.horario.application.service.tool.AcademicToolService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
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
@Slf4j
@RestController
@RequestMapping({"/mcp", "/api/v1/mcp"})
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class McpServerController {

    /** Versión del protocolo Model Context Protocol negociada en el handshake. */
    static final String PROTOCOL_VERSION = "2024-11-05";

    /** Identificador público del servidor MCP. */
    static final String SERVER_NAME = "horario-inteligente-mcp";

    /** Versión semántica del servidor MCP. */
    static final String SERVER_VERSION = "1.0.0";

    /** Zona horaria institucional de la universidad (America/Lima). */
    static final ZoneId LIMA_ZONE = ZoneId.of("America/Lima");

    /** Semana lectiva por defecto ante argumentos ausentes o no parseables. */
    static final int DEFAULT_CURRENT_WEEK = 6;

    /** Rango lectivo válido de semanas (1 a 18). */
    static final int MIN_CURRENT_WEEK = 1;
    static final int MAX_CURRENT_WEEK = 18;

    /** Códigos de error JSON-RPC 2.0 utilizados por el servidor. */
    private static final int PARSE_ERROR = -32700;
    private static final int INVALID_REQUEST = -32600;
    private static final int METHOD_NOT_FOUND = -32601;
    private static final int INTERNAL_ERROR = -32603;
    private static final int AUTH_REQUIRED = -32000;
    private static final int STUDENT_NOT_PERSISTED = -32002;

    private final AcademicToolService toolService;
    private final ObjectMapper objectMapper;
    private final com.utp.horario.infraestructure.security.SecurityIdentityResolver identityResolver;
    private final com.utp.horario.domain.model.repositories.IUtpPortalGateway utpPortalGateway;

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
        info.put("transport", "sse");
        info.put("tools", AcademicToolRegistry.getSupportedToolNames());
        info.put("authRequired", true);
        info.put("authParam", "token | studentCode");
        info.put("sseEndpoint", "/mcp/sse");
        info.put("messageEndpoint", "/mcp/message");
        info.put("activeSessions", activeSessions.size());
        return ResponseEntity.ok(info);
    }

    /**
     * 1. Handshake SSE: Gemini o cualquier cliente MCP remoto se conecta a esta URL.
     * Requiere autenticación mediante Token JWT en Header Authorization o Query Param 'token' / 'studentCode'.
     * La identidad del estudiante queda blindada e inmutable para toda la duración de la sesión.
     */
    @GetMapping(value = "/sse", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter handleSseConnection(
            @RequestParam(required = false) String token,
            @RequestParam(required = false) String studentId,
            @RequestParam(required = false) String studentCode,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        String effectiveAuthHeader = normalizeAuthHeader(authHeader, token);
        String effectiveStudentParam = firstNonBlank(studentCode, studentId);

        String resolvedStudentCode;
        try {
            resolvedStudentCode = identityResolver.resolveStudentCode(effectiveAuthHeader, effectiveStudentParam);
        } catch (Exception ex) {
            // Modo demostración: sin token UTP en vivo, la identidad se respalda en el registro
            // persistido en MySQL. Nunca se sintetizan datos: si no existe registro, se rechaza.
            String persisted = resolvePersistedStudent(effectiveStudentParam);
            if (persisted == null) {
                log.warn("[MCP-SSE] Conexión rechazada por falta de credenciales válidas: {}", ex.getMessage());
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Acceso no autorizado: se requiere un token de sesión válido o un código de "
                                + "estudiante con registro persistido en la base de datos.");
            }
            resolvedStudentCode = persisted;
            log.info("[MCP-SSE] Modo demostración: identidad respaldada por registro persistido [{}]", persisted);
        }
        final String authenticatedStudentCode = resolvedStudentCode;

        // El registro del token en la pasarela es best-effort: nunca debe abortar el handshake.
        if (effectiveAuthHeader != null && !effectiveAuthHeader.isBlank()) {
            try {
                utpPortalGateway.registerStudentToken(authenticatedStudentCode, effectiveAuthHeader);
            } catch (Exception ex) {
                log.warn("[MCP-SSE] No se pudo registrar el token en la pasarela para [{}]: {}",
                        authenticatedStudentCode, ex.getMessage());
            }
        }

        String sessionId = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(sessionTimeoutMs);
        long createdAt = System.currentTimeMillis();

        evictOldestSessionsIfNeeded();

        activeSessions.put(sessionId, new McpSession(sessionId, authenticatedStudentCode, emitter, createdAt));
        emitter.onCompletion(() -> {
            activeSessions.remove(sessionId);
            log.info("[MCP-SSE] Sesión completada: {} (Estudiante: {})", sessionId, authenticatedStudentCode);
        });
        emitter.onTimeout(() -> {
            activeSessions.remove(sessionId);
            log.warn("[MCP-SSE] Sesión expirada por timeout: {} (Estudiante: {})", sessionId, authenticatedStudentCode);
            safeComplete(emitter);
        });
        emitter.onError(e -> {
            activeSessions.remove(sessionId);
            log.info("[MCP-SSE] Sesión cerrada: {} ({})", sessionId, e.getMessage());
        });

        try {
            String messageEndpoint = "/mcp/message?sessionId=" + sessionId;
            emitter.send(SseEmitter.event()
                    .name("endpoint")
                    .data(messageEndpoint));
            log.info("[MCP-SSE] Sesión MCP autenticada para [{}] -> Session: {}", authenticatedStudentCode, sessionId);
        } catch (IOException | IllegalStateException e) {
            log.error("[MCP-SSE] Error emitiendo evento inicial 'endpoint': {}", e.getMessage());
            activeSessions.remove(sessionId);
            emitter.completeWithError(e);
        }

        return emitter;
    }

    /**
     * 2. Recepción de mensajes JSON-RPC 2.0 desde el cliente MCP (Claude Desktop / MCP Inspector / Cursor).
     * Soporta tanto el transporte SSE tradicional (/mcp/message?sessionId=...)
     * como el transporte Streamable HTTP moderno (POST /mcp/sse?studentCode=...).
     */
    @PostMapping(value = {"/message", "/sse", ""}, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> handleJsonRpcMessage(
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) String token,
            @RequestParam(required = false) String studentId,
            @RequestParam(value = "studentCode", required = false) String queryStudentCode,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) JsonNode request) {

        Map<String, Object> rpcResponse = new LinkedHashMap<>();
        rpcResponse.put("jsonrpc", "2.0");

        SseEmitter emitter = null;
        boolean notification = false;
        String studentCode = null;

        try {
            // ── Envelope JSON-RPC: el id de la solicitud se refleja exactamente ──────────────
            // Un id ausente identifica una notificacion (sin respuesta). Un id presente y nulo
            // es una peticion legitima y debe reflejarse como "id": null en la respuesta.
            boolean idPresent = (request != null) && request.has("id");
            JsonNode idNode = idPresent ? request.get("id") : null;
            if (idPresent) {
                rpcResponse.put("id", idNode == null ? NullNode.getInstance() : idNode);
            }
            notification = !idPresent;

            if (request == null || request.isNull() || request.isMissingNode()) {
                rpcResponse.put("error", jsonRpcError(PARSE_ERROR,
                        "Parse error: el cuerpo de la solicitud JSON-RPC está vacío o no es un JSON válido."));
                return ResponseEntity.ok(rpcResponse);
            }

            // ── Resolución de identidad ─────────────────────────────────────────────────────
            if (sessionId != null && !sessionId.isBlank()) {
                McpSession session = activeSessions.get(sessionId);
                if (session != null) {
                    emitter = session.emitter();
                    studentCode = session.studentCode();
                }
            }

            if (studentCode == null || studentCode.isBlank()) {
                String effectiveAuthHeader = normalizeAuthHeader(authHeader, token);
                String effectiveStudentParam = firstNonBlank(queryStudentCode, studentId);
                try {
                    studentCode = identityResolver.resolveStudentCode(effectiveAuthHeader, effectiveStudentParam);
                } catch (Exception ex) {
                    String persisted = resolvePersistedStudent(effectiveStudentParam);
                    if (persisted == null) {
                        log.warn("[MCP-JSONRPC] Petición rechazada por falta de credenciales válidas: {}", ex.getMessage());
                        rpcResponse.put("error", jsonRpcError(AUTH_REQUIRED,
                                "Acceso no autorizado: se requiere un token de sesión válido o un código de "
                                        + "estudiante con registro persistido en la base de datos."));
                        return ResponseEntity.ok(rpcResponse);
                    }
                    studentCode = persisted;
                    log.info("[MCP-JSONRPC] Modo demostración: identidad respaldada por registro persistido [{}]",
                            studentCode);
                }
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

        // Enviar la respuesta vía SSE al cliente conectado si existe stream abierto
        if (emitter != null) {
            try {
                String jsonPayload = objectMapper.writeValueAsString(rpcResponse);
                emitter.send(SseEmitter.event()
                        .name("message")
                        .data(jsonPayload));
                log.info("[MCP-SSE] Respuesta enviada por canal SSE (ID: {})", rpcResponse.get("id"));
            } catch (IOException | IllegalStateException e) {
                log.error("[MCP-SSE] Error enviando respuesta JSON-RPC a través de SSE: {}", e.getMessage());
            }
        }

        // Retornar 200 OK con el cuerpo JSON-RPC
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
        rpcResponse.put("error", jsonRpcError(PARSE_ERROR,
                "Parse error: el cuerpo de la solicitud JSON-RPC no es un JSON valido."));
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
     * Ejecución determinista de una herramienta académica con validación defensiva de argumentos.
     */
    private ToolOutcome executeTool(String toolName, JsonNode arguments, String studentCode) {
        if (toolName == null || toolName.isBlank()) {
            return ToolOutcome.error(toolErrorPayload(
                    "Nombre de herramienta ausente en la solicitud tools/call.",
                    AcademicToolRegistry.getSupportedToolNames()));
        }

        if (!AcademicToolRegistry.isSupportedTool(toolName)) {
            log.warn("[MCP-JSONRPC] Herramienta solicitada no soportada: {}", toolName);
            return ToolOutcome.error(toolErrorPayload(
                    "Herramienta no implementada en el servidor MCP: " + toolName,
                    AcademicToolRegistry.getSupportedToolNames()));
        }

        if (studentCode == null || studentCode.isBlank()) {
            return ToolOutcome.error(toolErrorPayload(
                    "No se identificó una sesión de estudiante activa. Inicia sesión en el portal UTP "
                            + "o invoca el servidor MCP con un código de estudiante con registro persistido.",
                    AcademicToolRegistry.getSupportedToolNames()));
        }

        try {
            String resultJson;
            switch (toolName) {
                case "get_enrolled_courses" ->
                        resultJson = objectMapper.writeValueAsString(toolService.getEnrolledCourses(studentCode));

                case "get_today_schedule" -> {
                    String date = readDateArgument(arguments);
                    if (date == null) {
                        return ToolOutcome.error(toolErrorPayload(
                                "Argumento 'date' inválido. Se espera una fecha en formato ISO YYYY-MM-DD.",
                                AcademicToolRegistry.getSupportedToolNames()));
                    }
                    resultJson = objectMapper.writeValueAsString(toolService.getTodaySchedule(studentCode, date));
                }

                case "get_syllabus_details" -> {
                    String query = AcademicToolRegistry.resolveCourseQuery(arguments).trim();
                    if (query.isEmpty()) {
                        return ToolOutcome.error(toolErrorPayload(
                                "Argumento obligatorio 'course_query' ausente. Envía el código oficial "
                                        + "de la asignatura (ej. 100000SI58) o su nombre natural.",
                                AcademicToolRegistry.getSupportedToolNames()));
                    }
                    resultJson = objectMapper.writeValueAsString(toolService.getSyllabusDetails(studentCode, query));
                }

                case "get_upcoming_evaluations" -> {
                    int week = readCurrentWeekArgument(arguments);
                    resultJson = objectMapper.writeValueAsString(toolService.getUpcomingEvaluations(studentCode, week));
                }

                default -> {
                    log.warn("[MCP-JSONRPC] Herramienta solicitada no soportada: {}", toolName);
                    return ToolOutcome.error(toolErrorPayload(
                            "Herramienta no implementada en el servidor MCP: " + toolName,
                            AcademicToolRegistry.getSupportedToolNames()));
                }
            }

            boolean empty = isEmptyPayload(resultJson);
            String finalJson = empty ? enrichEmptyPayload(resultJson, studentCode) : resultJson;
            return new ToolOutcome(finalJson, empty);
        } catch (Exception ex) {
            log.error("[MCP-JSONRPC] Error ejecutando tool {}: {}", toolName, ex.getMessage(), ex);
            return ToolOutcome.error(toolErrorPayload(
                    "Error ejecutando " + toolName + ": " + safeMessage(ex),
                    AcademicToolRegistry.getSupportedToolNames()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Lectura defensiva de argumentos
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Lee el argumento opcional {@code date}. Devuelve {@code null} si el formato es inválido.
     */
    private String readDateArgument(JsonNode arguments) {
        JsonNode node = arguments.path("date");
        if (node.isMissingNode() || node.isNull()) {
            return LocalDate.now(LIMA_ZONE).toString();
        }
        String raw = node.asText("").trim();
        if (raw.isEmpty()) {
            return LocalDate.now(LIMA_ZONE).toString();
        }
        try {
            return LocalDate.parse(raw, DateTimeFormatter.ISO_LOCAL_DATE).toString();
        } catch (DateTimeParseException e) {
            log.warn("[MCP-JSONRPC] Formato de fecha inválido recibido: '{}'", raw);
            return null;
        }
    }

    /**
     * Lee el argumento obligatorio {@code current_week} tolerando números y cadenas numéricas.
     * Ante un valor no interpretable se degrada a la semana lectiva por defecto.
     */
    private int readCurrentWeekArgument(JsonNode arguments) {
        JsonNode node = arguments.path("current_week");
        if (node.isMissingNode() || node.isNull()) {
            return DEFAULT_CURRENT_WEEK;
        }
        int value;
        if (node.isNumber()) {
            value = node.asInt();
        } else {
            String raw = node.asText("").trim();
            if (raw.isEmpty()) {
                return DEFAULT_CURRENT_WEEK;
            }
            try {
                value = Integer.parseInt(raw);
            } catch (NumberFormatException e) {
                log.warn("[MCP-JSONRPC] 'current_week' no numérico ('{}'), se usa la semana por defecto", raw);
                return DEFAULT_CURRENT_WEEK;
            }
        }
        if (value < MIN_CURRENT_WEEK) {
            return MIN_CURRENT_WEEK;
        }
        if (value > MAX_CURRENT_WEEK) {
            return MAX_CURRENT_WEEK;
        }
        return value;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Utilidades de soporte
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Detecta payloads sin información útil para no presentarlos como respuesta satisfactoria.
     */
    private boolean isEmptyPayload(String json) {
        try {
            JsonNode node = objectMapper.readTree(json);
            if (node == null || node.isMissingNode() || node.isNull()) {
                return true;
            }
            if (node.isArray()) {
                return node.isEmpty();
            }
            if (node.isObject()) {
                if (node.path("totalClasses").asInt(-1) == 0) {
                    return true;
                }
                if (node.path("totalCourses").asInt(-1) == 0) {
                    return true;
                }
                if (node.has("evaluations") && node.path("evaluations").isArray()
                        && node.path("evaluations").isEmpty()) {
                    return true;
                }
                if (node.has("weeklySchedule") && node.path("weeklySchedule").isArray()
                        && node.path("weeklySchedule").isEmpty()) {
                    return true;
                }
                JsonNode message = node.path("message");
                if (message.isTextual() && !message.asText("").isBlank()) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Añade un mensaje explicativo a un payload vacío para que el cliente MCP reciba un motivo
     * legible del resultado y no una estructura vacía sin contexto.
     */
    private String enrichEmptyPayload(String json, String studentCode) {
        try {
            JsonNode parsed = objectMapper.readTree(json);
            if (parsed != null && parsed.isObject()) {
                ObjectNode node = (ObjectNode) parsed;
                JsonNode message = node.path("message");
                if (!(message.isTextual() && !message.asText("").isBlank())) {
                    node.put("message", "No se encontraron datos persistidos para el estudiante "
                            + (studentCode == null ? "desconocido" : studentCode)
                            + ". Sincroniza el horario o el sílabo desde la aplicación antes de consultar.");
                }
                return objectMapper.writeValueAsString(node);
            }
            Map<String, Object> envelope = new LinkedHashMap<>();
            envelope.put("result", parsed);
            envelope.put("message", "No se encontraron datos persistidos para el estudiante "
                    + (studentCode == null ? "desconocido" : studentCode) + ".");
            return objectMapper.writeValueAsString(envelope);
        } catch (Exception e) {
            return json;
        }
    }

    /**
     * Construye el payload de error de una herramienta, incluyendo las herramientas realmente soportadas.
     */
    private String toolErrorPayload(String message, List<String> supportedTools) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("error", message);
        payload.put("supportedTools", supportedTools);
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            return "{\"error\":\"" + message + "\"}";
        }
    }

    private Map<String, Object> jsonRpcError(int code, String message) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("code", code);
        error.put("message", message);
        return error;
    }

    /**
     * Normaliza el encabezado de autorización aceptando el token con o sin prefijo {@code Bearer}.
     */
    private String normalizeAuthHeader(String authHeader, String token) {
        if (authHeader != null && !authHeader.isBlank()) {
            return authHeader;
        }
        if (token != null && !token.isBlank()) {
            return token.startsWith("Bearer ") ? token : "Bearer " + token;
        }
        return null;
    }

    private String firstNonBlank(String primary, String secondary) {
        if (primary != null && !primary.isBlank()) {
            return primary;
        }
        if (secondary != null && !secondary.isBlank()) {
            return secondary;
        }
        return null;
    }

    /**
     * Resuelve la identidad contra el registro persistido en MySQL (Aiven Cloud) cuando no hay
     * token de sesión UTP activo. Devuelve {@code null} si el estudiante no existe persistido.
     */
    private String resolvePersistedStudent(String candidate) {
        try {
            return toolService.resolvePersistedStudentCode(candidate);
        } catch (Exception e) {
            log.warn("[MCP] No se pudo consultar el registro persistido del estudiante: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Evicta la sesión más antigua cuando se supera el tope de sesiones simultáneas.
     */
    private void evictOldestSessionsIfNeeded() {
        if (activeSessions.size() < maxSessions) {
            return;
        }
        activeSessions.entrySet().stream()
                .min(Map.Entry.comparingByValue(java.util.Comparator.comparingLong(McpSession::createdAt)))
                .ifPresent(oldest -> {
                    log.warn("[MCP-SSE] Tope de sesiones alcanzado ({}). Evictando la sesión más antigua: {}",
                            maxSessions, oldest.getKey());
                    activeSessions.remove(oldest.getKey());
                    safeComplete(oldest.getValue().emitter());
                });
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
}
