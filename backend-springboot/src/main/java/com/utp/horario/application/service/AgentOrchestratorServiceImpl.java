package com.utp.horario.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.service.tool.AcademicToolDispatcher;
import com.utp.horario.application.service.tool.AcademicToolRegistry;
import com.utp.horario.application.service.tool.AcademicToolService;
import com.utp.horario.domain.model.value_objects.AiChatMessage;
import com.utp.horario.domain.model.value_objects.DailyQuotaStatus;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import com.utp.horario.domain.model.aggregate.Syllabus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Consumer;

@Slf4j
@Primary
@Service
@RequiredArgsConstructor
public class AgentOrchestratorServiceImpl implements AiAssistantService {

    private final AcademicToolService toolService;
    private final DailyQuotaService quotaService;
    private final ObjectMapper objectMapper;
    private final AcademicToolDispatcher toolDispatcher;

    @Value("${app.openrouter.api-url:https://openrouter.ai/api/v1/chat/completions}")
    private String openRouterApiUrl;

    @Value("${app.openrouter.api-key:}")
    private String openRouterApiKey;

    @Value("${app.openrouter.api-key-2:}")
    private String configuredApiKey2;

    @Value("${app.openrouter.api-key-3:}")
    private String configuredApiKey3;

    @Value("${app.openrouter.api-key-4:}")
    private String configuredApiKey4;

    @Value("${app.openrouter.api-key-5:}")
    private String configuredApiKey5;

    @Value("${app.openrouter.api-keys:}")
    private String configuredApiKeys;

    @Value("${app.openrouter.model:meta-llama/llama-3.3-70b-instruct}")
    private String defaultModelName;

    private static final int MAX_ITERATIONS = 5;

    /**
     * Guía local del Pre-Flight Guard (Fase 0.7.1): respuesta instantánea y a costo $0.00
     * cuando el estudiante aún no registra horario ni asignaturas en este ciclo.
     */
    private static final String PREFLIGHT_BLOCK_MESSAGE = "¡Hola! No detectamos un horario ni asignaturas "
            + "registradas para tu cuenta en este ciclo. Por favor, ve a la sección de Horarios y sincroniza "
            + "tu información institucional para que pueda ayudarte con tus clases, aulas, temas y evaluaciones.";

    // ─── Inner class: acumula los deltas de tool_call durante el streaming ───────

    private static class ToolCallAccumulator {
        String id = "";
        String type = "function";
        String name = "";
        StringBuilder arguments = new StringBuilder();

        Map<String, Object> toAssistantToolCall() {
            Map<String, Object> fn = new LinkedHashMap<>();
            fn.put("name", name);
            fn.put("arguments", arguments.toString());
            Map<String, Object> tc = new LinkedHashMap<>();
            tc.put("id", id);
            tc.put("type", type);
            tc.put("function", fn);
            return tc;
        }
    }

    // ─── Key pool ──────────────────────────────────────────────────────────────

    private List<String> getOrderedKeyPool() {
        List<String> pool = new ArrayList<>();
        addIfValid(pool, configuredApiKey2);
        addIfValid(pool, System.getenv("OPENROUTER_API_KEY_2"));
        addIfValid(pool, System.getProperty("OPENROUTER_API_KEY_2"));
        addIfValid(pool, configuredApiKey3);
        addIfValid(pool, System.getenv("OPENROUTER_API_KEY_3"));
        addIfValid(pool, System.getProperty("OPENROUTER_API_KEY_3"));
        addIfValid(pool, configuredApiKey4);
        addIfValid(pool, System.getenv("OPENROUTER_API_KEY_4"));
        addIfValid(pool, System.getProperty("OPENROUTER_API_KEY_4"));
        addIfValid(pool, configuredApiKey5);
        addIfValid(pool, System.getenv("OPENROUTER_API_KEY_5"));
        addIfValid(pool, System.getProperty("OPENROUTER_API_KEY_5"));

        String envKeys = System.getenv("OPENROUTER_API_KEYS");
        if (envKeys == null || envKeys.isBlank()) envKeys = System.getProperty("OPENROUTER_API_KEYS");
        if (envKeys != null && !envKeys.isBlank()) {
            for (String k : envKeys.split(",")) addIfValid(pool, k);
        }
        if (configuredApiKeys != null && !configuredApiKeys.isBlank()) {
            for (String k : configuredApiKeys.split(",")) addIfValid(pool, k);
        }
        for (int i = 1; i <= 10; i++) {
            addIfValid(pool, System.getenv("OPENROUTER_API_KEY_" + i));
            addIfValid(pool, System.getProperty("OPENROUTER_API_KEY_" + i));
        }
        addIfValid(pool, openRouterApiKey);
        addIfValid(pool, System.getenv("OPENROUTER_API_KEY"));
        addIfValid(pool, System.getProperty("OPENROUTER_API_KEY"));
        return pool;
    }

    private void addIfValid(List<String> list, String key) {
        if (key != null && !key.isBlank()) {
            String trimmed = key.trim();
            if (!list.contains(trimmed)) list.add(trimmed);
        }
    }

    // ─── Non-streaming path (mantiene compatibilidad) ──────────────────────────

    @Override
    public AiChatMessage processUserQuery(String studentCode, String message,
            ScheduleInterval ignoredSchedule, Map<String, Syllabus> ignoredSyllabi) {
        return processUserQuery(studentCode, message, ignoredSchedule, ignoredSyllabi, null, null);
    }

    @Override
    public AiChatMessage processUserQuery(String studentCode, String message,
            ScheduleInterval ignoredSchedule, Map<String, Syllabus> ignoredSyllabi, String requestedModel) {
        return processUserQuery(studentCode, message, ignoredSchedule, ignoredSyllabi, requestedModel, null);
    }

    @Override
    public AiChatMessage processUserQuery(String studentCode, String message,
            ScheduleInterval schedule, Map<String, Syllabus> syllabi,
            String requestedModel, List<Map<String, String>> history) {

        // ─── Pre-Flight Guard (Fase 0.7.1) ────────────────────────────────────────
        // Sin datos académicos reales NO se gasta cuota ni se llama a OpenRouter:
        // el estudiante recibe la guía de sincronización localmente (0 ms, $0.00).
        if (!hasRealAcademicData(studentCode, schedule)) {
            log.info("[AgentOrchestrator] 🛡️ Pre-Flight Guard: sin datos académicos para [{}] — respuesta local", studentCode);
            return AiChatMessage.builder()
                    .id(UUID.randomUUID().toString()).role("assistant")
                    .content(PREFLIGHT_BLOCK_MESSAGE)
                    .timestamp(LocalDateTime.now())
                    .metadata(Map.of("preflightBlocked", true))
                    .build();
        }

        DailyQuotaStatus quota = quotaService.consumeQuota(studentCode);
        if (!quota.getAllowed()) {
            return AiChatMessage.builder()
                    .id(UUID.randomUUID().toString()).role("assistant")
                    .content("Has alcanzado tu límite de " + quota.getMax() + " consultas diarias.")
                    .timestamp(LocalDateTime.now()).metadata(Map.of("rateLimitReached", true)).build();
        }

        String effectiveModel = resolveModel(requestedModel);
        Integer currentWeek = resolveCurrentWeek(studentCode, schedule);
        List<Map<String, Object>> messages = buildMessages(message, history, currentWeek, schedule);
        List<String> toolsExecuted = new ArrayList<>();
        List<Map<String, Object>> toolDetails = new ArrayList<>();

        try {
            for (int iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
                if (iteration > 0) log.info("[AgentOrchestrator] 🔄 Enviando resultado de herramienta a OpenRouter para síntesis final...");

                Map<String, Object> payload = buildPayload(effectiveModel, messages, false, studentCode);
                JsonNode responseNode = callOpenRouterWithFailover(payload);
                JsonNode choiceMessage = responseNode.at("/choices/0/message");
                JsonNode toolCalls = choiceMessage.get("tool_calls");

                if (toolCalls == null || !toolCalls.isArray() || toolCalls.isEmpty()) {
                    // Respaldo: ciertos proveedores no materializan la estructura nativa
                    // tool_calls y el modelo emite la invocacion como bloque JSON en el texto.
                    JsonNode rescued = rescueToolCalls(choiceMessage.path("content").asText(""));
                    if (rescued != null && !rescued.isEmpty()) {
                        toolCalls = rescued;
                    }
                }

                if (toolCalls == null || !toolCalls.isArray() || toolCalls.isEmpty()) {
                    String finalContent = choiceMessage.path("content").asText();
                    log.info("[AgentOrchestrator] ✅ Síntesis final generada por OpenRouter ({} caracteres)", finalContent.length());
                    return AiChatMessage.builder()
                            .id(UUID.randomUUID().toString()).role("assistant").content(finalContent)
                            .timestamp(LocalDateTime.now())
                            .metadata(Map.of("toolsUsed", toolsExecuted, "toolDetails", toolDetails,
                                    "iterations", iteration + 1, "model", effectiveModel))
                            .build();
                }

                messages.add(objectMapper.convertValue(choiceMessage, Map.class));
                for (JsonNode call : toolCalls) {
                    String toolCallId = call.path("id").asText();
                    String functionName = call.at("/function/name").asText();
                    JsonNode argsNode = objectMapper.readTree(call.at("/function/arguments").asText());
                    toolsExecuted.add(functionName);
                    // El despachador nunca lanza: un fallo de herramienta degenera en JSON con
                    // isError=true que el LLM explica al estudiante (el ciclo ReAct no se aborta).
                    String toolResultJson = toolDispatcher.dispatch(functionName, argsNode, studentCode).json();
                    Map<String, Object> detail = new LinkedHashMap<>();
                    detail.put("name", functionName); detail.put("arguments", argsNode); detail.put("result", toolResultJson);
                    toolDetails.add(detail);
                    messages.add(Map.of("role", "tool", "tool_call_id", toolCallId, "content", toolResultJson));
                }
            }
            return fallbackMessage("Se alcanzó el límite de pasos sin consolidar una respuesta final.");
        } catch (Exception e) {
            log.error("[AgentOrchestrator] Error en ciclo de agente: {}", e.getMessage(), e);
            return fallbackMessage("Ocurrió una incidencia de conexión con el copiloto.");
        }
    }

    // ─── Streaming real path ───────────────────────────────────────────────────

    @Override
    public void streamProcessUserQuery(
            String studentCode, String message, String requestedModel,
            List<Map<String, String>> history,
            Consumer<String> onToken,
            Consumer<Map<String, Object>> onToolEvent,
            Runnable onDone,
            Consumer<Throwable> onError) {

        // ─── Pre-Flight Guard (Fase 0.7.1) ────────────────────────────────────────
        // Sin datos académicos (el canal de streaming no recibe schedule: se consulta
        // el snapshot persistido) NO se gasta cuota ni inferencia; la guía de
        // sincronización se emite localmente por el canal de tokens.
        if (!hasRealAcademicData(studentCode, null)) {
            log.info("[AgentOrchestrator] 🛡️ Pre-Flight Guard (stream): sin datos académicos para [{}] — respuesta local", studentCode);
            onToken.accept(PREFLIGHT_BLOCK_MESSAGE);
            onDone.run();
            return;
        }

        DailyQuotaStatus quota = quotaService.consumeQuota(studentCode);
        if (!quota.getAllowed()) {
            onToken.accept("Has alcanzado tu límite de " + quota.getMax() + " consultas diarias.");
            onDone.run();
            return;
        }

        String effectiveModel = resolveModel(requestedModel);
        Integer currentWeek = resolveCurrentWeek(studentCode, null);
        List<Map<String, Object>> messages = buildMessages(message, history, currentWeek, null);

        try {
            for (int iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
                Map<String, Object> payload = buildPayload(effectiveModel, messages, true, studentCode);
                StreamIterationResult result = streamOneIteration(payload, onToken, onToolEvent);

                if (result.isToolCall()) {
                    // Añadir respuesta del asistente (con tool_calls) y resultados al historial
                    Map<String, Object> assistantMsg = new LinkedHashMap<>();
                    assistantMsg.put("role", "assistant");
                    assistantMsg.put("content", result.contentSoFar().isBlank() ? null : result.contentSoFar());
                    assistantMsg.put("tool_calls", result.toolCallNodes());
                    messages.add(assistantMsg);

                    for (ToolCallAccumulator acc : result.toolCalls()) {
                        log.info("[AgentOrchestrator] 🔧 Ejecutando tool: {} args={}", acc.name, acc.arguments);
                        JsonNode argsNode;
                        try {
                            argsNode = objectMapper.readTree(
                                    acc.arguments.isEmpty() ? "{}" : acc.arguments.toString());
                        } catch (Exception ex) {
                            argsNode = objectMapper.createObjectNode();
                        }

                        long startMs = System.currentTimeMillis();
                        if (onToolEvent != null) {
                            onToolEvent.accept(buildFriendlyActivityEvent(acc.id, "start", acc.name, argsNode, null));
                        }

                        try {
                            // El despachador nunca lanza; el catch se mantiene como red de seguridad.
                            String toolResult = toolDispatcher.dispatch(acc.name, argsNode, studentCode).json();
                            long duration = System.currentTimeMillis() - startMs;
                            if (onToolEvent != null) {
                                onToolEvent.accept(buildFriendlyActivityEvent(acc.id, "done", acc.name, argsNode, duration));
                            }
                            messages.add(Map.of("role", "tool", "tool_call_id", acc.id, "content", toolResult));
                        } catch (Exception te) {
                            log.warn("[AgentOrchestrator] ⚠️ Error ejecutando {}: {}", acc.name, te.getMessage());
                            if (onToolEvent != null) {
                                onToolEvent.accept(buildFriendlyActivityEvent(acc.id, "error", acc.name, argsNode, null));
                            }
                            messages.add(Map.of("role", "tool", "tool_call_id", acc.id,
                                    "content", "{\"error\":\"" + te.getMessage() + "\"}"));
                        }
                    }
                    // Continuar el loop para que el modelo genere la respuesta con los tool results
                } else {
                    // finish_reason: stop → streaming completado
                    log.info("[AgentOrchestrator] ✅ Stream completado tras {} iteración(es)", iteration + 1);
                    onDone.run();
                    return;
                }
            }
            onToken.accept("\n\nSe alcanzó el límite de pasos.");
            onDone.run();
        } catch (Exception e) {
            log.error("[AgentOrchestrator] ❌ Error en stream ReAct: {}", e.getMessage(), e);
            onError.accept(e);
        }
    }

    // ─── Streaming de una iteración, retorna si fue tool_call o stop ───────────

    private StreamIterationResult streamOneIteration(
            Map<String, Object> payload,
            Consumer<String> onToken,
            Consumer<Map<String, Object>> onToolEvent) throws Exception {

        List<String> keyPool = getOrderedKeyPool();
        if (keyPool.isEmpty()) throw new IllegalStateException("No se encontraron claves de OpenRouter.");

        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
        String jsonBody = objectMapper.writeValueAsString(payload);

        Exception lastEx = null;
        for (String key : keyPool) {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(openRouterApiUrl))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + key)
                        .header("HTTP-Referer", "https://horario-inteligente.utp.edu.pe")
                        .header("X-Title", "Horario Inteligente UTP")
                        .timeout(Duration.ofSeconds(60))
                        .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                        .build();

                HttpResponse<java.util.stream.Stream<String>> resp =
                        client.send(request, HttpResponse.BodyHandlers.ofLines());

                if (resp.statusCode() == 429 || resp.statusCode() == 401
                        || resp.statusCode() == 402 || resp.statusCode() == 403) {
                    log.warn("[AgentOrchestrator] OpenRouter key falló con status {}. Rotando...", resp.statusCode());
                    resp.body().close();
                    continue;
                }
                if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                    throw new RuntimeException("OpenRouter HTTP " + resp.statusCode());
                }

                // Acumuladores para tool_calls
                Map<Integer, ToolCallAccumulator> toolCallMap = new LinkedHashMap<>();
                StringBuilder contentBuilder = new StringBuilder();
                boolean isToolCall = false;
                String finishReason = null;

                try (var lines = resp.body()) {
                    for (String line : (Iterable<String>) lines::iterator) {
                        if (line.isBlank() || line.startsWith(":")) continue; // keep-alive SSE comment
                        if (!line.startsWith("data:")) continue;
                        String data = line.substring(5).trim();
                        if ("[DONE]".equals(data)) break;

                        try {
                            JsonNode chunk = objectMapper.readTree(data);
                            JsonNode delta = chunk.at("/choices/0/delta");
                            String fr = chunk.at("/choices/0/finish_reason").asText(null);
                            if (fr != null && !fr.equals("null")) finishReason = fr;

                            // Texto de respuesta → emitir inmediatamente al frontend
                            if (delta.has("content") && !delta.path("content").isNull()) {
                                String token = delta.path("content").asText("");
                                if (!token.isEmpty()) {
                                    contentBuilder.append(token);
                                    if (isDegenerateRepetition(contentBuilder)) {
                                        log.warn("[AgentOrchestrator] ⚠️ Bucle degenerativo detectado en stream ('{}'). Cortando respuesta de forma segura.", token);
                                        break;
                                    }
                                    onToken.accept(token);
                                }
                            }

                            // Tool call deltas → acumular
                            if (delta.has("tool_calls")) {
                                isToolCall = true;
                                for (JsonNode tc : delta.path("tool_calls")) {
                                    int idx = tc.path("index").asInt(0);
                                    ToolCallAccumulator acc = toolCallMap.computeIfAbsent(idx, i -> new ToolCallAccumulator());
                                    if (!tc.path("id").isMissingNode()) acc.id = tc.path("id").asText(acc.id);
                                    if (!tc.path("type").isMissingNode()) acc.type = tc.path("type").asText(acc.type);
                                    JsonNode fn = tc.path("function");
                                    if (!fn.isMissingNode()) {
                                        if (fn.has("name") && !fn.path("name").asText("").isBlank()) {
                                            acc.name = fn.path("name").asText(acc.name);
                                            // Emitir evento de herramienta al frontend tan pronto como sepamos el nombre
                                            Map<String, Object> toolEvt = new LinkedHashMap<>();
                                            toolEvt.put("name", acc.name);
                                            toolEvt.put("args", Map.of());
                                            onToolEvent.accept(toolEvt);
                                        }
                                        if (fn.has("arguments")) {
                                            acc.arguments.append(fn.path("arguments").asText(""));
                                        }
                                    }
                                }
                            }
                        } catch (Exception parseEx) {
                            log.debug("[AgentOrchestrator] Chunk no parseable (ignorado): {}", parseEx.getMessage());
                        }
                    }
                }

                List<ToolCallAccumulator> toolCalls = new ArrayList<>(toolCallMap.values());

                // Respaldo: si el proveedor no materializo tool_calls nativos, el modelo pudo
                // emitir la invocacion como bloque JSON dentro del contenido transmitido.
                if (toolCalls.isEmpty()) {
                    JsonNode rescued = rescueToolCalls(contentBuilder.toString());
                    if (rescued != null && !rescued.isEmpty()) {
                        JsonNode call = rescued.get(0);
                        ToolCallAccumulator acc = new ToolCallAccumulator();
                        acc.id = call.path("id").asText("call_txt_" + UUID.randomUUID().toString().substring(0, 8));
                        acc.type = call.path("type").asText("function");
                        acc.name = call.at("/function/name").asText("");
                        acc.arguments.append(call.at("/function/arguments").asText("{}"));
                        if (!acc.name.isBlank()) {
                            toolCalls.add(acc);
                            isToolCall = true;
                        }
                    }
                }
                List<Map<String, Object>> toolCallNodes = toolCalls.stream()
                        .map(ToolCallAccumulator::toAssistantToolCall).toList();

                boolean wasToolCall = "tool_calls".equals(finishReason) || (!isToolCall == false && !toolCalls.isEmpty());
                return new StreamIterationResult(wasToolCall || !toolCalls.isEmpty(), contentBuilder.toString(), toolCalls, toolCallNodes);

            } catch (Exception e) {
                lastEx = e;
                log.warn("[AgentOrchestrator] ⚠️ Fallo streaming con clave: {}", e.getMessage());
            }
        }
        throw lastEx != null ? lastEx : new RuntimeException("Todas las claves de OpenRouter fallaron en streaming");
    }

    private record StreamIterationResult(
            boolean isToolCall,
            String contentSoFar,
            List<ToolCallAccumulator> toolCalls,
            List<Map<String, Object>> toolCallNodes) {}

    // ─── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Resuelve el modelo efectivo de inferencia.
     *
     * <p>Prioridad: el modelo solicitado por el cliente, la configuracion del backend
     * ({@code app.openrouter.model}) y, en ultimo termino, un modelo gratuito por defecto.</p>
     *
     * @param requestedModel modelo solicitado por el cliente, puede ser nulo
     * @return identificador del modelo que atendera la peticion
     */
    public String resolveModel(String requestedModel) {
        String effective = (requestedModel != null && !requestedModel.isBlank()) ? requestedModel
                : (defaultModelName != null && !defaultModelName.isBlank() ? defaultModelName
                        : "nvidia/nemotron-3.5-lightning:free");
        log.info("[AgentOrchestrator] 🤖 Modelo efectivo de inferencia: {}", effective);
        return effective;
    }

    /**
     * Respaldo ante proveedores que no materializan la estructura nativa {@code tool_calls}.
     *
     * <p>Algunos modelos de OpenRouter responden con la invocacion de la herramienta
     * serializada como un bloque JSON dentro del contenido, en lugar de emitirla en el
     * canal {@code tool_calls}. En ese caso el orquestador no detecta la llamada y el
     * modelo se limita a narrar su plan. Este metodo rescata esa invocacion y la
     * devuelve con la forma estandar de OpenAI para que el flujo continue con normalidad.</p>
     *
     * @param content contenido textual generado por el modelo
     * @return arreglo con la invocacion recuperada, o {@code null} si no hay ninguna
     */
    JsonNode rescueToolCalls(String content) {
        if (content == null || content.isBlank()) return null;
        String json = extractToolCallJson(content);
        if (json == null) return null;
        try {
            JsonNode node = objectMapper.readTree(json);
            if (node == null || !node.isObject()) return null;

            String name = node.path("name").asText("").trim();
            if (name.isEmpty() || !AcademicToolRegistry.getSupportedToolNames().contains(name)) {
                return null;
            }
            JsonNode params = node.has("parameters") ? node.path("parameters") : node.path("arguments");
            String args = (params != null && params.isObject()) ? params.toString() : "{}";

            var calls = objectMapper.createArrayNode();
            var call = calls.addObject();
            call.put("id", "call_txt_" + UUID.randomUUID().toString().substring(0, 8));
            call.put("type", "function");
            var fn = call.putObject("function");
            fn.put("name", name);
            fn.put("arguments", args);

            log.info("[AgentOrchestrator] 🛟 Invocación de herramienta recuperada del texto del modelo: {} args={}", name, args);
            return calls;
        } catch (Exception e) {
            log.debug("[AgentOrchestrator] El contenido del modelo no contenía una invocación de herramienta: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extrae el primer objeto JSON del contenido, priorizando los bloques cercados por
     * codigo json y usando, como alternativa, el primer objeto JSON suelto del texto.
     */
    private String extractToolCallJson(String content) {
        int fence = content.indexOf("```");
        if (fence >= 0) {
            int end = content.indexOf("```", fence + 3);
            if (end > fence) {
                String block = content.substring(fence + 3, end).trim();
                if (block.toLowerCase().startsWith("json")) {
                    block = block.substring(4).trim();
                }
                if (block.startsWith("{")) {
                    return block;
                }
            }
        }
        int first = content.indexOf('{');
        int last = content.lastIndexOf('}');
        if (first >= 0 && last > first) {
            return content.substring(first, last + 1);
        }
        return null;
    }

    /**
     * Resuelve la semana lectiva vigente para anclar temporalmente las respuestas del agente.
     *
     * <p>Prioridad: el horario recibido en la peticion (fuente de la interfaz) y, en su
     * defecto, el snapshot persistido del horario en la base de datos relacional.</p>
     */
    private Integer resolveCurrentWeek(String studentCode, ScheduleInterval schedule) {
        if (schedule != null && schedule.getWeekNumber() != null && schedule.getWeekNumber() > 0) {
            return schedule.getWeekNumber();
        }
        try {
            return toolService.resolveCurrentWeek(studentCode);
        } catch (Exception e) {
            log.debug("[AgentOrchestrator] No se pudo resolver la semana lectiva vigente: {}", e.getMessage());
            return null;
        }
    }

    private List<Map<String, Object>> buildMessages(String message, List<Map<String, String>> history) {
        return buildMessages(message, history, null, null);
    }

    private List<Map<String, Object>> buildMessages(String message, List<Map<String, String>> history,
            Integer currentWeek, ScheduleInterval schedule) {
        List<Map<String, Object>> messages = new ArrayList<>();
        String periodName = schedule != null ? schedule.getPeriodName() : null;
        Integer totalWeeks = schedule != null ? schedule.getTotalWeeks() : null;
        messages.add(Map.of("role", "system",
                "content", getSystemPrompt(currentWeek, periodName, totalWeeks)));
        if (history != null && !history.isEmpty()) {
            int startIdx = Math.max(0, history.size() - 8);
            for (int i = startIdx; i < history.size(); i++) {
                Map<String, String> prev = history.get(i);
                if (prev == null) continue;
                String role = prev.get("role"), content = prev.get("content");
                if (content != null && !content.isBlank() && ("user".equals(role) || "assistant".equals(role))) {
                    messages.add(Map.of("role", role, "content", content.trim()));
                }
            }
        }
        if (messages.isEmpty() || !"user".equals(messages.get(messages.size() - 1).get("role"))
                || !message.trim().equals(messages.get(messages.size() - 1).get("content"))) {
            messages.add(Map.of("role", "user", "content", message.trim()));
        }
        return messages;
    }

    private Map<String, Object> buildPayload(String model, List<Map<String, Object>> messages,
            boolean stream, String studentCode) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("messages", messages);
        payload.put("tools", AcademicToolRegistry.getOpenAiToolDefinitions());
        payload.put("tool_choice", "auto");
        payload.put("temperature", 0.3);
        payload.put("max_tokens", 1800);
        payload.put("frequency_penalty", 0.25);
        payload.put("repetition_penalty", 1.08);
        payload.put("stream", stream);
        // session_id para sticky routing → mayor hit de prompt cache en el proveedor
        if (studentCode != null && !studentCode.isBlank()) {
            payload.put("session_id", studentCode + "_" + LocalDate.now(java.time.ZoneId.of("America/Lima")));
        }
        return payload;
    }

    /**
     * Pre-Flight Guard (Fase 0.7.1): determina si el estudiante muestra datos académicos
     * reales antes de gastar cuota o inferencia. Fuente 1: el schedule que el cliente
     * adjuntó a la petición (clases o cursos declarados). Fuente 2: el snapshot persistido
     * del periodo vigente ({@link AcademicToolService#hasPersistedSchedule(String)}).
     * La identidad `anonymous_user` o ausente se trata como sin datos (nunca se consulta
     * nada, ni se fabrican respuestas académicas a nombre de nadie).
     */
    private boolean hasRealAcademicData(String studentCode, ScheduleInterval clientSchedule) {
        if (clientSchedule != null) {
            boolean hasClasses = clientSchedule.getClasses() != null && !clientSchedule.getClasses().isEmpty();
            boolean hasCourses = clientSchedule.getCourses() != null && !clientSchedule.getCourses().isEmpty();
            if (hasClasses || hasCourses) {
                return true;
            }
        }
        String code = toolService.resolveEffectiveStudentCode(studentCode);
        if (code == null || "anonymous_user".equalsIgnoreCase(code)) {
            return false;
        }
        return toolService.hasPersistedSchedule(code);
    }

    private String getSystemPrompt() {
        return getSystemPrompt(null, null, null);
    }

    /**
     * Construye el prompt del sistema enriquecido con el contexto academico vigente.
     *
     * <p>El ancla temporal (semana lectiva) es indispensable: sin ella el agente no puede
     * responder consultas de alcance semanal como "que temas tocan esta semana" y solo puede
     * volcar el cronograma integro o pedir precision al estudiante.</p>
     *
     * @param currentWeek semana lectiva vigente (1 a 18), o {@code null} si se desconoce
     * @param periodName  periodo lectivo vigente
     * @param totalWeeks  total de semanas del periodo
     */
    private String getSystemPrompt(Integer currentWeek, String periodName, Integer totalWeeks) {
        String weekLine = (currentWeek != null && currentWeek > 0)
                ? "- Semana lectiva actual: " + currentWeek
                        + (totalWeeks != null && totalWeeks > 0 ? " de " + totalWeeks : "")
                        + (periodName != null && !periodName.isBlank() ? " (periodo " + periodName + ")" : "")
                : "- Semana lectiva actual: NO CONOCIDA. Si el estudiante pregunta por 'esta semana', "
                        + "consulta 'get_today_schedule' y declara que no dispone del numero de semana.";
        return """
        Eres el Copiloto Académico de Horario Inteligente UTP, un asistente universitario inteligente, proactivo, empático y muy resolutivo para estudiantes de la Universidad Tecnológica del Perú.

        Tienes acceso a herramientas en tiempo real para consultar:
        - Horarios y aulas del estudiante para hoy o fechas específicas (`get_today_schedule`)
        - Temarios semanales, fórmulas de evaluación y sílabos oficiales (`get_syllabus_details`)
        - Cursos matriculados del ciclo actual (`get_enrolled_courses`)
        - Evaluaciones próximas y tareas (`get_upcoming_evaluations`)

        CONTEXTO ACADÉMICO VIGENTE (datos verificados por el sistema: no los pidas, no los supongas, no los contradigas):
        - Fecha actual: %s (Zona horaria: Lima, Perú).
        %s

        DIRECTRICES DE RAZONAMIENTO Y PROACTIVIDAD:
        1. Memoria Conversacional Continua:
           - Mantén siempre la coherencia del diálogo. Si en un turno previo se mencionó un curso o clase (ej. \"Formación para la Investigación - Sistemas\"), cualquier pregunta subsiguiente (\"¿qué temas tocan?\", \"¿a qué hora termina?\", \"¿quién es el docente?\", \"¿qué entra en la práctica?\") se refiere a ese curso. ¡NUNCA preguntes qué curso le interesa si ya está en el contexto previo!

        2. Consultas sobre \"hoy\" o \"la clase de hoy\":
           - Si el estudiante pregunta qué clases tiene hoy (\"¿qué clases tengo hoy?\"), consulta `get_today_schedule`.
           - Si el estudiante pregunta por los temas de hoy (\"¿qué temas tocan hoy en la clase?\", \"¿de qué trata la clase de hoy?\"):
             a) Primero consulta `get_today_schedule` para saber qué clase tiene hoy.
             b) Si tiene 1 clase hoy: Consulta inmediatamente `get_syllabus_details` con el nombre o código de ese curso y explica de forma directa el tema correspondiente a la semana actual. ¡Sé proactivo, NUNCA interrogues al alumno preguntándole qué curso quiere si hoy solo tiene esa clase!
             c) Si tiene más de 1 clase hoy: Consulta el temario de esas clases y resume los temas de cada una ordenadamente.
             d) Si no tiene clases hoy: Indícaselo cordialmente y ofrécele consultar el temario de sus cursos matriculados si lo desea.

        2.b. Consultas sobre "esta semana" o "el temario de la semana":
           a. Usa SIEMPRE el número de semana indicado en el CONTEXTO ACADÉMICO VIGENTE. Nunca lo deduzcas, nunca lo inventes y nunca lo preguntes al estudiante.
           b. Si el estudiante NO nombró un curso, identifícalo a partir de `get_today_schedule` (la clase de esta semana) o de `get_enrolled_courses`. Si hay una sola opción evidente, úsala sin preguntar. Si hay varias, elige la más relevante y anuncia cuál usas en una sola frase.
           c. Invoca `get_syllabus_details` con DOS argumentos: `course_query` (el curso) y `week` (la semana vigente del contexto). El parámetro `week` acota el resultado a esa semana.
           d. Responde SOLO con esa semana: unidad, temas, actividades y entrega programada si existe. NO enumeres el cronograma completo de 18 semanas ante una pregunta de una sola semana.
           e. Si el curso no tiene contenido para esa semana, indícalo con UNA frase precisa y ofrece el temario de otras semanas. No inventes contenidos.

        3. Consultas sobre cursos específicos:
           - Cuando el estudiante nombre un curso (ej. 'desarrollo web', 'cloud', 'gestión ti', 'investigación'), invoca directamente `get_syllabus_details` pasando el nombre en `course_query`. Si la pregunta tiene alcance temporal ("esta semana", "la semana 5"), añade también `week` con ese valor.

        4. Consultas genéricas abiertas:
           - Solo si la pregunta es totalmente abierta sin referirse a hoy ni a ningún curso previo (\"¿qué cursos llevo?\", \"¿cuáles son mis materias?\"), consulta `get_enrolled_courses`.

        5. Tono y Formato de Presentación:
           - Tono natural de compañero universitario experto y resolutivo. Cero frases mecánicas (\"Siguiente Paso...\", \"Una vez que me des esta información...\", \"Los cursos matriculados son:\").
           - Formato Markdown impecable:
             * Separa SIEMPRE cada párrafo, encabezado y bloque con doble salto de línea.
             * Usa encabezados breves con `###`.
             * Usa viñetas con guion `- ` para listar aulas, horarios, docentes o temas.
             * Resalta en **negrita** nombres de asignaturas, aulas, docentes y temas clave.
        """.formatted(
                LocalDate.now(java.time.ZoneId.of("America/Lima")).toString(),
                weekLine);
    }

    private JsonNode callOpenRouterWithFailover(Map<String, Object> body) throws Exception {
        List<String> keyPool = getOrderedKeyPool();
        if (keyPool.isEmpty()) throw new IllegalStateException("No se encontraron claves de OpenRouter configuradas.");
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
        String jsonBody = objectMapper.writeValueAsString(body);
        Exception lastException = null;
        for (int i = 0; i < keyPool.size(); i++) {
            String key = keyPool.get(i);
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(openRouterApiUrl))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + key)
                        .header("HTTP-Referer", "https://horario-inteligente.utp.edu.pe")
                        .header("X-Title", "Horario Inteligente UTP")
                        .timeout(Duration.ofSeconds(25))
                        .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                        .build();
                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() >= 200 && response.statusCode() < 300) return objectMapper.readTree(response.body());
                if (response.statusCode() == 429 || response.statusCode() == 401
                        || response.statusCode() == 402 || response.statusCode() == 403) {
                    log.warn("[AgentOrchestrator] OpenRouter key #{} falló con status {}. Rotando...", i + 1, response.statusCode());
                    lastException = new RuntimeException("HTTP " + response.statusCode() + ": " + response.body());
                    continue;
                }
                throw new RuntimeException("OpenRouter HTTP " + response.statusCode() + ": " + response.body());
            } catch (Exception e) {
                lastException = e;
                log.warn("[AgentOrchestrator] Error con llave #{}: {}", i + 1, e.getMessage());
            }
        }
        throw lastException != null ? lastException : new RuntimeException("Fallaron todas las claves de OpenRouter");
    }

    private AiChatMessage fallbackMessage(String note) {
        return AiChatMessage.builder()
                .id(UUID.randomUUID().toString()).role("assistant")
                .content("### Copiloto Académico UTP\n" + note + "\nPuedes consultar directamente tu horario en la pestaña **Horario Semanal**.")
                .timestamp(LocalDateTime.now()).metadata(Map.of("fallback", true)).build();
    }

    private Map<String, Object> buildFriendlyActivityEvent(String id, String phase, String toolName, JsonNode args, Long durationMs) {
        Map<String, Object> evt = new LinkedHashMap<>();
        evt.put("id", id != null ? id : "act-" + System.currentTimeMillis());
        evt.put("phase", phase); // "start", "done", "error"
        evt.put("tool", toolName);
        if (durationMs != null) evt.put("durationMs", durationMs);

        String detail = "";
        if (args != null) {
            // Las claves deben coincidir con los esquemas reales declarados en AcademicToolRegistry.
            if (args.hasNonNull("course_query")) detail = args.get("course_query").asText();
            else if (args.hasNonNull("course_code")) detail = args.get("course_code").asText();
            else if (args.hasNonNull("date")) detail = "Fecha " + args.get("date").asText();
            else if (args.hasNonNull("current_week")) detail = "Semana " + args.get("current_week").asText();
        }
        evt.put("detail", detail);

        String label;
        if ("start".equals(phase)) {
            label = switch (toolName) {
                case "get_syllabus_details" -> detail.isBlank() ? "Consultando sílabo y rúbricas rectoras..." : "Analizando sílabo de " + detail + "...";
                case "get_today_schedule" -> "Consultando horario de clases y aulas...";
                case "get_upcoming_evaluations" -> "Verificando evaluaciones y entregas pendientes...";
                case "get_enrolled_courses" -> "Sincronizando asignaturas y secciones activas...";
                default -> "Ejecutando consulta académica...";
            };
        } else if ("done".equals(phase)) {
            label = switch (toolName) {
                case "get_syllabus_details" -> detail.isBlank() ? "Sílabo y fórmulas analizadas" : "Sílabo de " + detail + " analizado";
                case "get_today_schedule" -> "Horario y sesiones recuperadas";
                case "get_upcoming_evaluations" -> "Próximas evaluaciones identificadas";
                case "get_enrolled_courses" -> "Asignaturas sincronizadas con éxito";
                default -> "Acción completada con éxito";
            };
        } else {
            label = "Error en consulta académica";
        }
        evt.put("label", label);
        return evt;
    }

    private boolean isDegenerateRepetition(StringBuilder sb) {
        if (sb.length() < 20) return false;
        // 1. Repetición del mismo carácter (ej. !!!!!!!!!!!!!!)
        char lastChar = sb.charAt(sb.length() - 1);
        int consecutive = 0;
        for (int i = sb.length() - 1; i >= 0 && sb.charAt(i) == lastChar; i--) {
            consecutive++;
            if (consecutive >= 12) return true;
        }
        // 2. Repetición de patrón de 2 o 3 caracteres al final
        if (sb.length() >= 30) {
            String tail = sb.substring(sb.length() - 20);
            if (tail.matches("^(..)\\1{5,}$") || tail.matches("^(...)\\1{4,}$")) {
                return true;
            }
        }
        return false;
    }
}
