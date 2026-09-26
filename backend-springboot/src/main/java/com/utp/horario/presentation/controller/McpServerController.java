package com.utp.horario.presentation.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.service.tool.AcademicToolRegistry;
import com.utp.horario.application.service.tool.AcademicToolService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servidor MCP Oficial sobre HTTP / SSE (Model Context Protocol).
 * Permite que IAs externas (Google Gemini Spark, Claude Desktop, ChatGPT Actions, Cursor, etc.)
 * consuman las herramientas académicas del estudiante de forma segura y remota.
 */
@Slf4j
@RestController
@RequestMapping({"/mcp", "/api/v1/mcp"})
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class McpServerController {

    private final AcademicToolService toolService;
    private final ObjectMapper objectMapper;
    private final com.utp.horario.infrastructure.security.SecurityIdentityResolver identityResolver;

    public record McpSession(
            String sessionId,
            String studentCode,
            SseEmitter emitter
    ) {}

    private final Map<String, McpSession> activeSessions = new ConcurrentHashMap<>();

    /**
     * Endpoint informativo para verificación rápida desde el navegador o tests HTTP.
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getMcpInfo() {
        return ResponseEntity.ok(Map.of(
                "name", "utp-academic-mcp",
                "version", "1.0.0",
                "protocolVersion", "2024-11-05",
                "transport", "sse",
                "authRequired", true,
                "authParam", "token | studentCode",
                "sseEndpoint", "/mcp/sse",
                "messageEndpoint", "/mcp/message",
                "activeSessions", activeSessions.size()
        ));
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

        String effectiveAuthHeader = authHeader;
        if ((effectiveAuthHeader == null || effectiveAuthHeader.isBlank()) && token != null && !token.isBlank()) {
            effectiveAuthHeader = token.startsWith("Bearer ") ? token : "Bearer " + token;
        }
        String effectiveStudentParam = (studentCode != null && !studentCode.isBlank()) ? studentCode : studentId;

        String authenticatedStudentCode;
        try {
            authenticatedStudentCode = identityResolver.resolveStudentCode(effectiveAuthHeader, effectiveStudentParam);
        } catch (Exception ex) {
            log.warn("[MCP-SSE] ⛔ Conexión rechazada por falta de credenciales válidas: {}", ex.getMessage());
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Acceso no autorizado: Se requiere un token de sesión o un código de estudiante legítimo."
            );
        }

        String sessionId = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(0L);

        activeSessions.put(sessionId, new McpSession(sessionId, authenticatedStudentCode, emitter));
        emitter.onCompletion(() -> {
            activeSessions.remove(sessionId);
            log.info("[MCP-SSE] Sesión completada: {} (Estudiante: {})", sessionId, authenticatedStudentCode);
        });
        emitter.onTimeout(() -> {
            activeSessions.remove(sessionId);
            log.warn("[MCP-SSE] Sesión expiró por timeout: {} (Estudiante: {})", sessionId, authenticatedStudentCode);
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
            log.info("[MCP-SSE] 🚀 Sesión MCP autenticada para [{}] -> Session: {}", authenticatedStudentCode, sessionId);
        } catch (IOException e) {
            log.error("[MCP-SSE] Error emitiendo evento inicial 'endpoint': {}", e.getMessage());
            emitter.completeWithError(e);
        }

        return emitter;
    }

    /**
     * 2. Recepción de mensajes JSON-RPC 2.0 desde el cliente MCP (Gemini Spark / Claude / Cursor).
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
            @RequestBody JsonNode request) {

        SseEmitter emitter = null;
        String resolvedStudentCode = null;

        if (sessionId != null && !sessionId.isBlank()) {
            McpSession session = activeSessions.get(sessionId);
            if (session != null) {
                emitter = session.emitter();
                resolvedStudentCode = session.studentCode();
            }
        }

        if (resolvedStudentCode == null || resolvedStudentCode.isBlank()) {
            String effectiveAuthHeader = authHeader;
            if ((effectiveAuthHeader == null || effectiveAuthHeader.isBlank()) && token != null && !token.isBlank()) {
                effectiveAuthHeader = token.startsWith("Bearer ") ? token : "Bearer " + token;
            }
            String effectiveStudentParam = (queryStudentCode != null && !queryStudentCode.isBlank()) ? queryStudentCode : studentId;

            try {
                resolvedStudentCode = identityResolver.resolveStudentCode(effectiveAuthHeader, effectiveStudentParam);
            } catch (Exception ex) {
                log.warn("[MCP-JSONRPC] ⛔ Petición rechazada por falta de credenciales válidas: {}", ex.getMessage());
                return ResponseEntity.status(401).body(Map.of(
                        "jsonrpc", "2.0",
                        "error", Map.of("code", -32000, "message", "Acceso no autorizado: Se requiere un token o código de estudiante legítimo.")
                ));
            }
        }

        final String studentCode = resolvedStudentCode;
        String method = request.path("method").asText("");
        JsonNode idNode = request.get("id");
        log.info("[MCP-JSONRPC] 📩 Método recibido: {} (ID: {}) para estudiante [{}]", method, idNode, studentCode);

        Map<String, Object> rpcResponse = new LinkedHashMap<>();
        rpcResponse.put("jsonrpc", "2.0");
        if (idNode != null) {
            rpcResponse.put("id", idNode);
        }

        switch (method) {
            case "initialize" -> {
                rpcResponse.put("result", Map.of(
                        "protocolVersion", "2024-11-05",
                        "capabilities", Map.of(
                                "tools", Map.of("listChanged", false)
                        ),
                        "serverInfo", Map.of(
                                "name", "utp-academic-mcp",
                                "version", "1.0.0"
                        )
                ));
            }

            case "notifications/initialized" -> {
                log.info("[MCP-JSONRPC] ✅ Handshake completado exitosamente por cliente.");
                return ResponseEntity.ok().build();
            }

            case "ping" -> {
                rpcResponse.put("result", Map.of());
            }

            case "tools/list" -> {
                List<Map<String, Object>> tools = new ArrayList<>();
                for (var toolDef : AcademicToolRegistry.getOpenAiToolDefinitions()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> func = (Map<String, Object>) toolDef.get("function");
                    tools.add(Map.of(
                            "name", func.get("name"),
                            "description", func.get("description"),
                            "inputSchema", func.get("parameters")
                    ));
                }
                log.info("[MCP-JSONRPC] 📋 Listando {} herramientas a cliente MCP.", tools.size());
                rpcResponse.put("result", Map.of("tools", tools));
            }

            case "tools/call" -> {
                String toolName = request.at("/params/name").asText();
                JsonNode arguments = request.at("/params/arguments");
                log.info("[MCP-JSONRPC] 🛠️ Invocación de tool: {} con argumentos: {} para estudiante [{}]", toolName, arguments, studentCode);

                try {
                    String resultJson = switch (toolName) {
                        case "get_enrolled_courses" -> objectMapper.writeValueAsString(toolService.getEnrolledCourses(studentCode));
                        case "get_today_schedule" -> {
                            String date = arguments.has("date") ? arguments.path("date").asText() : "";
                            yield objectMapper.writeValueAsString(toolService.getTodaySchedule(studentCode, date));
                        }
                        case "get_syllabus_details" -> {
                            String query = arguments.has("course_query") 
                                    ? arguments.path("course_query").asText() 
                                    : (arguments.has("course_code") ? arguments.path("course_code").asText() : "");
                            yield objectMapper.writeValueAsString(toolService.getSyllabusDetails(query));
                        }
                        case "get_upcoming_evaluations" -> {
                            int week = arguments.has("current_week") ? arguments.path("current_week").asInt() : 6;
                            yield objectMapper.writeValueAsString(toolService.getUpcomingEvaluations(studentCode, week));
                        }
                        default -> "{\"error\":\"Herramienta no implementada en el servidor MCP: " + toolName + "\"}";
                    };

                    rpcResponse.put("result", Map.of(
                            "content", List.of(Map.of("type", "text", "text", resultJson)),
                            "isError", false
                    ));
                } catch (Exception ex) {
                    log.error("[MCP-JSONRPC] ❌ Error ejecutando tool {}: {}", toolName, ex.getMessage(), ex);
                    rpcResponse.put("result", Map.of(
                            "content", List.of(Map.of("type", "text", "text", "Error ejecutando " + toolName + ": " + ex.getMessage())),
                            "isError", true
                    ));
                }
            }

            default -> {
                log.warn("[MCP-JSONRPC] Método desconocido: {}", method);
                rpcResponse.put("error", Map.of(
                        "code", -32601,
                        "message", "Method not found: " + method
                ));
            }
        }

        // Enviar la respuesta vía SSE al cliente conectado si existe stream abierto
        if (emitter != null) {
            try {
                String jsonPayload = objectMapper.writeValueAsString(rpcResponse);
                emitter.send(SseEmitter.event()
                        .name("message")
                        .data(jsonPayload));
                log.info("[MCP-SSE] 📤 Respuesta enviada por canal SSE (ID: {})", idNode);
            } catch (IOException e) {
                log.error("[MCP-SSE] Error enviando respuesta JSON-RPC a través de SSE: {}", e.getMessage());
            }
        }

        // Retornar 200 OK con el cuerpo JSON-RPC
        return ResponseEntity.ok(rpcResponse);
    }
}
