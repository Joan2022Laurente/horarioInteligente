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
    private final Map<String, SseEmitter> activeSessions = new ConcurrentHashMap<>();

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
                "sseEndpoint", "/mcp/sse",
                "messageEndpoint", "/mcp/message",
                "activeSessions", activeSessions.size()
        ));
    }

    /**
     * 1. Handshake SSE: Gemini o cualquier cliente MCP remoto se conecta a esta URL.
     */
    @GetMapping(value = "/sse", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter handleSseConnection(HttpServletRequest request) {
        String sessionId = UUID.randomUUID().toString();
        // Timeout 0L indica stream persistente sin desconexión prematura
        SseEmitter emitter = new SseEmitter(0L);

        activeSessions.put(sessionId, emitter);
        emitter.onCompletion(() -> {
            activeSessions.remove(sessionId);
            log.info("[MCP-SSE] Sesión completada: {}", sessionId);
        });
        emitter.onTimeout(() -> {
            activeSessions.remove(sessionId);
            log.warn("[MCP-SSE] Sesión expiró por timeout: {}", sessionId);
        });
        emitter.onError(e -> {
            activeSessions.remove(sessionId);
            log.info("[MCP-SSE] Sesión cerrada con incidencia: {} ({})", sessionId, e.getMessage());
        });

        try {
            // El estándar MCP SSE exige enviar un evento 'endpoint' con la ruta de mensajería POST
            String messageEndpoint = "/mcp/message?sessionId=" + sessionId;
            emitter.send(SseEmitter.event()
                    .name("endpoint")
                    .data(messageEndpoint));
            log.info("[MCP-SSE] 🚀 Cliente MCP conectado. Session ID: {} -> Endpoint: {}", sessionId, messageEndpoint);
        } catch (IOException e) {
            log.error("[MCP-SSE] Error emitiendo evento inicial 'endpoint': {}", e.getMessage());
            emitter.completeWithError(e);
        }

        return emitter;
    }

    /**
     * 2. Recepción de mensajes JSON-RPC 2.0 desde el cliente MCP (Gemini Spark).
     */
    @PostMapping("/message")
    public ResponseEntity<Map<String, Object>> handleJsonRpcMessage(
            @RequestParam String sessionId,
            @RequestBody JsonNode request) {

        SseEmitter emitter = activeSessions.get(sessionId);
        if (emitter == null) {
            log.warn("[MCP-JSONRPC] Petición para sesión inexistente o finalizada: {}", sessionId);
            return ResponseEntity.status(404).body(Map.of(
                    "jsonrpc", "2.0",
                    "error", Map.of("code", -32000, "message", "Sesión SSE no encontrada o expirada")
            ));
        }

        String method = request.path("method").asText("");
        JsonNode idNode = request.get("id");
        log.info("[MCP-JSONRPC] 📩 Método recibido: {} (ID: {}) para sesión {}", method, idNode, sessionId);

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
                log.info("[MCP-JSONRPC] 🛠️ Invocación de tool: {} con argumentos: {}", toolName, arguments);

                String studentCode = (arguments.has("student_code") && !arguments.path("student_code").asText().isBlank())
                        ? arguments.path("student_code").asText()
                        : "U19204085"; // Código predeterminado o demostración

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

        // Enviar la respuesta vía SSE al cliente conectado
        try {
            String jsonPayload = objectMapper.writeValueAsString(rpcResponse);
            emitter.send(SseEmitter.event()
                    .name("message")
                    .data(jsonPayload));
            log.info("[MCP-SSE] 📤 Respuesta enviada por canal SSE (ID: {})", idNode);
        } catch (IOException e) {
            log.error("[MCP-SSE] Error enviando respuesta JSON-RPC a través de SSE: {}", e.getMessage());
        }

        // Retornar 200 OK
        return ResponseEntity.ok(rpcResponse);
    }
}
