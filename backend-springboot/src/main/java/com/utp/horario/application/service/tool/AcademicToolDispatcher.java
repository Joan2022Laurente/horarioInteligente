package com.utp.horario.application.service.tool;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Despachador unificado de herramientas académicas del Agente IA (Fase 0.6).
 *
 * <p>Es el ÚNICO punto de ejecución de las 4 herramientas académicas: lo consumen tanto el
 * orquestador ReAct del chat web ({@code AgentOrchestratorServiceImpl}) como el servidor MCP
 * ({@code McpServerController}), eliminando el switch duplicado y garantizando paridad total
 * de validaciones, mensajes y enriquecimiento entre ambos canales.</p>
 *
 * <p><b>Contrato de uso:</b> {@link #dispatch} nunca lanza excepciones. Ante cualquier fallo —
 * herramienta desconocida, argumentos inválidos, timeout de pasarela, sesión sin token —
 * devuelve un {@link ToolExecution} con JSON estructurado y {@code isError=true}, con un
 * mensaje claro que el LLM puede explicar al estudiante en lugar de abortar el ciclo.</p>
 *
 * <p><b>Resolución de {@code current_week} ({@code get_upcoming_evaluations}):</b>
 * <ol>
 *   <li>Número o cadena numérica → se acota al rango lectivo 1-18.</li>
 *   <li>Ausente, vacía o no interpretable → se resuelve dinámicamente la semana lectiva
 *       vigente del estudiante desde el Read Model persistido
 *       ({@link AcademicToolService#resolveCurrentWeek(String)}).</li>
 *   <li>Sin snapshot conocido → constante {@link #DEFAULT_CURRENT_WEEK} (último recurso;
 *       nunca un valor por defecto por encima del dato real del estudiante).</li>
 * </ol></p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AcademicToolDispatcher {

    /**
     * Semana lectiva por defecto. Último recurso de {@code get_upcoming_evaluations} cuando
     * el modelo no emitió {@code current_week} y tampoco existe snapshot persistido que
     * permita resolver la semana dinámicamente.
     */
    public static final int DEFAULT_CURRENT_WEEK = 6;

    /** Resultado acotado de una ejecución de herramienta: el JSON siempre está presente. */
    public record ToolExecution(String json, boolean isError) {
        static ToolExecution error(String json) {
            return new ToolExecution(json, true);
        }
    }

    private final AcademicToolService toolService;
    private final ObjectMapper objectMapper;

    /**
     * Despacha la ejecución de una herramienta académica para el agente o un cliente MCP.
     * Nunca lanza: todo fallo degenera en un JSON estructurado con {@code isError=true}.
     * Un payload vacío se enriquece con un mensaje explicativo antes de entregarse.
     *
     * @param toolName    nombre declarado por el modelo o el cliente MCP
     * @param arguments   argumentos del tool call (null se trata como objeto vacío)
     * @param studentCode código del estudiante con sesión activa
     * @return {@link ToolExecution} con el JSON de resultado y su condición de error
     */
    public ToolExecution dispatch(String toolName, JsonNode arguments, String studentCode) {
        JsonNode args = (arguments == null) ? objectMapper.createObjectNode() : arguments;

        if (toolName == null || toolName.isBlank()) {
            return ToolExecution.error(toolErrorPayload(
                    "Nombre de herramienta ausente en la solicitud tools/call.",
                    AcademicToolRegistry.getSupportedToolNames()));
        }

        if (!AcademicToolRegistry.isSupportedTool(toolName)) {
            log.warn("[ToolDispatcher] Herramienta solicitada no soportada: {}", toolName);
            return ToolExecution.error(toolErrorPayload(
                    "Herramienta no implementada en el servidor MCP: " + toolName,
                    AcademicToolRegistry.getSupportedToolNames()));
        }

        if (studentCode == null || studentCode.isBlank()) {
            return ToolExecution.error(toolErrorPayload(
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
                    String date = readDateArgument(args);
                    if (date == null) {
                        return ToolExecution.error(toolErrorPayload(
                                "Argumento 'date' inválido. Se espera una fecha en formato ISO YYYY-MM-DD.",
                                AcademicToolRegistry.getSupportedToolNames()));
                    }
                    resultJson = objectMapper.writeValueAsString(toolService.getTodaySchedule(studentCode, date));
                }

                case "get_syllabus_details" -> {
                    String query = AcademicToolRegistry.resolveCourseQuery(args).trim();
                    if (query.isEmpty()) {
                        return ToolExecution.error(toolErrorPayload(
                                "Argumento obligatorio 'course_query' ausente. Envía el código oficial "
                                        + "de la asignatura (ej. 100000SI58) o su nombre natural.",
                                AcademicToolRegistry.getSupportedToolNames()));
                    }
                    Integer week = readOptionalWeekArgument(args);
                    resultJson = objectMapper.writeValueAsString(week == null
                            ? toolService.getSyllabusDetails(studentCode, query)
                            : toolService.getSyllabusDetails(studentCode, query, week));
                }

                case "get_upcoming_evaluations" -> {
                    int week = resolveCurrentWeekForTool(args, studentCode);
                    resultJson = objectMapper.writeValueAsString(toolService.getUpcomingEvaluations(studentCode, week));
                }

                default -> {
                    log.warn("[ToolDispatcher] Herramienta solicitada no soportada: {}", toolName);
                    return ToolExecution.error(toolErrorPayload(
                            "Herramienta no implementada en el servidor MCP: " + toolName,
                            AcademicToolRegistry.getSupportedToolNames()));
                }
            }

            boolean empty = isEmptyPayload(resultJson);
            String finalJson = empty ? enrichEmptyPayload(resultJson, studentCode) : resultJson;
            return new ToolExecution(finalJson, empty);
        } catch (Exception ex) {
            log.error("[ToolDispatcher] Error ejecutando tool {}: {}", toolName, ex.getMessage(), ex);
            return ToolExecution.error(toolErrorPayload(
                    "Error ejecutando " + toolName + ": " + safeMessage(ex),
                    AcademicToolRegistry.getSupportedToolNames()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Lectura defensiva de argumentos (migrada del servidor MCP)
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Lee el argumento opcional {@code date}. Devuelve {@code null} si el formato es inválido.
     */
    private String readDateArgument(JsonNode arguments) {
        JsonNode node = arguments.path("date");
        if (node.isMissingNode() || node.isNull()) {
            return LocalDate.now(AcademicToolService.LIMA_ZONE).toString();
        }
        String raw = node.asText("").trim();
        if (raw.isEmpty()) {
            return LocalDate.now(AcademicToolService.LIMA_ZONE).toString();
        }
        try {
            return LocalDate.parse(raw, DateTimeFormatter.ISO_LOCAL_DATE).toString();
        } catch (DateTimeParseException e) {
            log.warn("[ToolDispatcher] Formato de fecha inválido recibido: '{}'", raw);
            return null;
        }
    }

    /**
     * Resuelve {@code current_week}: ante un valor explícito interpretable lo acota al
     * rango lectivo 1-18; ante ausencia o valor no interpretable consulta dinámicamente
     * la semana vigente del estudiante ({@link AcademicToolService#resolveCurrentWeek(String)});
     * y solo si no hay snapshot conocido cae en {@link #DEFAULT_CURRENT_WEEK}.
     */
    private int resolveCurrentWeekForTool(JsonNode arguments, String studentCode) {
        JsonNode node = arguments.path("current_week");
        Integer explicitValue = null;
        if (!node.isMissingNode() && !node.isNull()) {
            if (node.isNumber()) {
                explicitValue = node.asInt();
            } else {
                String raw = node.asText("").trim();
                if (!raw.isEmpty()) {
                    try {
                        explicitValue = Integer.parseInt(raw);
                    } catch (NumberFormatException e) {
                        log.warn("[ToolDispatcher] 'current_week' no interpretable ('{}'): se resuelve dinámicamente", raw);
                    }
                }
            }
        }
        if (explicitValue != null) {
            return clampCurrentWeek(explicitValue);
        }
        Integer dynamicWeek = null;
        try {
            dynamicWeek = toolService.resolveCurrentWeek(studentCode);
        } catch (Exception ex) {
            log.warn("[ToolDispatcher] resolveCurrentWeek falló para {}: {}", studentCode, safeMessage(ex));
        }
        if (dynamicWeek != null) {
            return clampCurrentWeek(dynamicWeek);
        }
        return DEFAULT_CURRENT_WEEK;
    }

    /** Acota una semana lectiva al rango institucional 1-18 (semántica histórica del MCP). */
    private int clampCurrentWeek(int value) {
        if (value < AcademicToolService.MIN_CURRENT_WEEK) {
            return AcademicToolService.MIN_CURRENT_WEEK;
        }
        if (value > AcademicToolService.MAX_CURRENT_WEEK) {
            return AcademicToolService.MAX_CURRENT_WEEK;
        }
        return value;
    }

    /**
     * Lee el argumento opcional {@code week} (semana lectiva). Acepta numero o cadena
     * numerica; ante un valor no interpretable devuelve {@code null} para preservar el
     * comportamiento historico de la herramienta (sílabo completo).
     */
    private Integer readOptionalWeekArgument(JsonNode arguments) {
        JsonNode node = arguments.path("week");
        if (node.isMissingNode() || node.isNull()) {
            return null;
        }
        int value;
        if (node.isNumber()) {
            value = node.asInt();
        } else {
            String raw = node.asText("").trim();
            if (raw.isEmpty()) {
                return null;
            }
            try {
                value = Integer.parseInt(raw);
            } catch (NumberFormatException e) {
                log.warn("[ToolDispatcher] 'week' no numérico ('{}'), se ignora el filtro por semana", raw);
                return null;
            }
        }
        if (value < AcademicToolService.MIN_CURRENT_WEEK || value > AcademicToolService.MAX_CURRENT_WEEK) {
            log.warn("[ToolDispatcher] 'week' fuera del rango lectivo ({}), se ignora el filtro por semana", value);
            return null;
        }
        return value;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Utilidades (migradas del servidor MCP)
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
     * Añade un mensaje explicativo a un payload vacío para que el cliente reciba un motivo
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

    private String safeMessage(Exception ex) {
        String message = ex.getMessage();
        return (message == null || message.isBlank()) ? ex.getClass().getSimpleName() : message;
    }
}
