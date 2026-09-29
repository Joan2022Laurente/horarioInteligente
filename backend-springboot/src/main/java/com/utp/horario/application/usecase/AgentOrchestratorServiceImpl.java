package com.utp.horario.application.usecase;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.service.tool.AcademicToolRegistry;
import com.utp.horario.application.service.tool.AcademicToolService;
import com.utp.horario.domain.model.AiChatMessage;
import com.utp.horario.domain.model.DailyQuotaStatus;
import com.utp.horario.domain.model.ScheduleInterval;
import com.utp.horario.domain.model.Syllabus;
import com.utp.horario.domain.port.in.AiAssistantServicePort;
import com.utp.horario.domain.port.in.DailyQuotaServicePort;
import com.utp.horario.infrastructure.external.OpenRouterModelSelector;
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

@Slf4j
@Primary
@Service
@RequiredArgsConstructor
public class AgentOrchestratorServiceImpl implements AiAssistantServicePort {

    private final AcademicToolService toolService;
    private final DailyQuotaServicePort quotaService;
    private final OpenRouterModelSelector modelSelector;
    private final ObjectMapper objectMapper;

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
        if (envKeys == null || envKeys.isBlank()) {
            envKeys = System.getProperty("OPENROUTER_API_KEYS");
        }
        if (envKeys != null && !envKeys.isBlank()) {
            for (String k : envKeys.split(",")) {
                addIfValid(pool, k);
            }
        }
        if (configuredApiKeys != null && !configuredApiKeys.isBlank()) {
            for (String k : configuredApiKeys.split(",")) {
                addIfValid(pool, k);
            }
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
            if (!list.contains(trimmed)) {
                list.add(trimmed);
            }
        }
    }

    @Override
    public AiChatMessage processUserQuery(
            String studentCode,
            String message,
            ScheduleInterval ignoredSchedule,
            Map<String, Syllabus> ignoredSyllabi) {
        return processUserQuery(studentCode, message, ignoredSchedule, ignoredSyllabi, null, null);
    }

    @Override
    public AiChatMessage processUserQuery(
            String studentCode,
            String message,
            ScheduleInterval ignoredSchedule,
            Map<String, Syllabus> ignoredSyllabi,
            String requestedModel) {
        return processUserQuery(studentCode, message, ignoredSchedule, ignoredSyllabi, requestedModel, null);
    }

    @Override
    public AiChatMessage processUserQuery(
            String studentCode,
            String message,
            ScheduleInterval ignoredSchedule,
            Map<String, Syllabus> ignoredSyllabi,
            String requestedModel,
            List<Map<String, String>> history) {

        // 1. Control de Cuota
        DailyQuotaStatus quota = quotaService.consumeQuota(studentCode);
        if (!quota.getAllowed()) {
            return AiChatMessage.builder()
                    .id(UUID.randomUUID().toString())
                    .role("assistant")
                    .content("Has alcanzado tu límite de " + quota.getMax() + " consultas diarias.")
                    .timestamp(LocalDateTime.now())
                    .metadata(Map.of("rateLimitReached", true))
                    .build();
        }

        // Selección de modelo
        String effectiveModel = (requestedModel != null && !requestedModel.isBlank())
                ? requestedModel
                : (defaultModelName != null && !defaultModelName.isBlank() ? defaultModelName : "meta-llama/llama-3.3-70b-instruct");

        // 2. Historial de Mensajes Inicial (System Prompt optimizado con directrices de proactividad y memoria)
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of(
                "role", "system",
                "content", getSystemPrompt()
        ));

        // Incorporar turnos conversacionales previos (máximo últimos 8 turnos válidos)
        if (history != null && !history.isEmpty()) {
            int startIdx = Math.max(0, history.size() - 8);
            for (int i = startIdx; i < history.size(); i++) {
                Map<String, String> prev = history.get(i);
                if (prev == null) continue;
                String role = prev.get("role");
                String content = prev.get("content");
                if (content != null && !content.isBlank() && ("user".equals(role) || "assistant".equals(role))) {
                    messages.add(Map.of("role", role, "content", content.trim()));
                }
            }
        }

        // Agregar el mensaje actual si no es duplicado del último mensaje de usuario en el historial
        if (messages.isEmpty() || !"user".equals(messages.get(messages.size() - 1).get("role"))
                || !message.trim().equals(messages.get(messages.size() - 1).get("content"))) {
            messages.add(Map.of("role", "user", "content", message.trim()));
        }

        List<String> toolsExecuted = new ArrayList<>();
        List<Map<String, Object>> toolDetails = new ArrayList<>();

        // 3. Loop ReAct con límite de iteraciones (Guarda anti-bucle)
        try {
            for (int iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
                if (iteration > 0 && !toolsExecuted.isEmpty()) {
                    log.info("[AgentOrchestrator] 🔄 Enviando resultado de herramienta a OpenRouter para síntesis final...");
                }

                Map<String, Object> requestPayload = new LinkedHashMap<>();
                requestPayload.put("model", effectiveModel);
                requestPayload.put("messages", messages);
                requestPayload.put("tools", AcademicToolRegistry.getOpenAiToolDefinitions());
                requestPayload.put("tool_choice", "auto");
                requestPayload.put("temperature", 0.2);

                JsonNode responseNode = callOpenRouterWithFailover(requestPayload);
                JsonNode choiceMessage = responseNode.at("/choices/0/message");

                JsonNode toolCalls = choiceMessage.get("tool_calls");

                // Caso A: El modelo generó respuesta de texto final (sin herramientas)
                if (toolCalls == null || !toolCalls.isArray() || toolCalls.isEmpty()) {
                    String finalContent = choiceMessage.path("content").asText();
                    log.info("[AgentOrchestrator] ✅ Síntesis final generada por OpenRouter ({} caracteres)", finalContent.length());
                    return AiChatMessage.builder()
                            .id(UUID.randomUUID().toString())
                            .role("assistant")
                            .content(finalContent)
                            .timestamp(LocalDateTime.now())
                            .metadata(Map.of(
                                    "toolsUsed", toolsExecuted,
                                    "toolDetails", toolDetails,
                                    "iterations", iteration + 1
                            ))
                            .build();
                }

                // Caso B: El modelo solicitó invocar herramientas
                Map<String, Object> assistantMsg = objectMapper.convertValue(choiceMessage, Map.class);
                messages.add(assistantMsg);

                for (JsonNode call : toolCalls) {
                    String toolCallId = call.path("id").asText();
                    String functionName = call.at("/function/name").asText();
                    String argumentsRaw = call.at("/function/arguments").asText();
                    JsonNode argsNode = objectMapper.readTree(argumentsRaw);

                    toolsExecuted.add(functionName);
                    String toolResultJson = executeTool(functionName, argsNode, studentCode);

                    Map<String, Object> detail = new LinkedHashMap<>();
                    detail.put("name", functionName);
                    detail.put("arguments", argsNode);
                    detail.put("result", toolResultJson);
                    toolDetails.add(detail);

                    // Devolver resultado de la tool al LLM
                    messages.add(Map.of(
                            "role", "tool",
                            "tool_call_id", toolCallId,
                            "content", toolResultJson
                    ));
                }
            }

            return fallbackMessage("Se alcanzó el límite de pasos sin consolidar una respuesta final.");

        } catch (Exception e) {
            log.error("[AgentOrchestrator] Error en ciclo de agente: {}", e.getMessage(), e);
            return fallbackMessage("Ocurrió una incidencia de conexión con el copiloto.");
        }
    }

    private String executeTool(String toolName, JsonNode args, String studentCode) throws Exception {
        return switch (toolName) {
            case "get_enrolled_courses" -> {
                yield objectMapper.writeValueAsString(toolService.getEnrolledCourses(studentCode));
            }
            case "get_today_schedule" -> {
                String date = args.has("date") 
                        ? args.path("date").asText() 
                        : LocalDate.now(java.time.ZoneId.of("America/Lima")).toString();
                yield objectMapper.writeValueAsString(toolService.getTodaySchedule(studentCode, date));
            }
            case "get_syllabus_details" -> {
                String query = args.has("course_query") 
                        ? args.path("course_query").asText() 
                        : (args.has("course_code") ? args.path("course_code").asText() : "");
                yield objectMapper.writeValueAsString(toolService.getSyllabusDetails(studentCode, query));
            }
            case "get_upcoming_evaluations" -> {
                int week = args.has("current_week") ? args.path("current_week").asInt() : 6;
                yield objectMapper.writeValueAsString(toolService.getUpcomingEvaluations(studentCode, week));
            }
            default -> "{\"error\": \"Herramienta desconocida\"}";
        };
    }

    private String getSystemPrompt() {
        return """
        Eres el Copiloto Académico de Horario Inteligente UTP, un asistente universitario inteligente, proactivo, empático y muy resolutivo para estudiantes de la Universidad Tecnológica del Perú.

        Tienes acceso a herramientas en tiempo real para consultar:
        - Horarios y aulas del estudiante para hoy o fechas específicas (`get_today_schedule`)
        - Temarios semanales, fórmulas de evaluación y sílabos oficiales (`get_syllabus_details`)
        - Cursos matriculados del ciclo actual (`get_enrolled_courses`)
        - Evaluaciones próximas y tareas (`get_upcoming_evaluations`)

        DIRECTRICES DE RAZONAMIENTO Y PROACTIVIDAD:
        1. Memoria Conversacional Continua:
           - Mantén siempre la coherencia del diálogo. Si en un turno previo se mencionó un curso o clase (ej. "Formación para la Investigación - Sistemas"), cualquier pregunta subsiguiente ("¿qué temas tocan?", "¿a qué hora termina?", "¿quién es el docente?", "¿qué entra en la práctica?") se refiere a ese curso. ¡NUNCA preguntes qué curso le interesa si ya está en el contexto previo!

        2. Consultas sobre "hoy" o "la clase de hoy":
           - Si el estudiante pregunta qué clases tiene hoy ("¿qué clases tengo hoy?"), consulta `get_today_schedule`.
           - Si el estudiante pregunta por los temas de hoy ("¿qué temas tocan hoy en la clase?", "¿de qué trata la clase de hoy?"):
             a) Primero consulta `get_today_schedule` para saber qué clase tiene hoy.
             b) Si tiene 1 clase hoy: Consulta inmediatamente `get_syllabus_details` con el nombre o código de ese curso y explica de forma directa el tema correspondiente a la semana actual. ¡Sé proactivo, NUNCA interrogues al alumno preguntándole qué curso quiere si hoy solo tiene esa clase!
             c) Si tiene más de 1 clase hoy: Consulta el temario de esas clases y resume los temas de cada una ordenadamente.
             d) Si no tiene clases hoy: Indícaselo cordialmente y ofrécele consultar el temario de sus cursos matriculados si lo desea.

        3. Consultas sobre cursos específicos:
           - Cuando el estudiante nombre un curso (ej. 'desarrollo web', 'cloud', 'gestión ti', 'investigación'), invoca directamente `get_syllabus_details` pasando el nombre en `course_query`.

        4. Consultas genéricas abiertas:
           - Solo si la pregunta es totalmente abierta sin referirse a hoy ni a ningún curso previo ("¿qué cursos llevo?", "¿cuáles son mis materias?"), consulta `get_enrolled_courses`.

        5. Tono y Formato de Presentación:
           - Tono natural de compañero universitario experto y resolutivo. Cero frases mecánicas ("Siguiente Paso...", "Una vez que me des esta información...", "Los cursos matriculados son:").
           - Formato Markdown impecable:
             * Separa SIEMPRE cada párrafo, encabezado y bloque con doble salto de línea.
             * Usa encabezados breves con `###`.
             * Usa viñetas con guion `- ` para listar aulas, horarios, docentes o temas.
             * Resalta en **negrita** nombres de asignaturas, aulas, docentes y temas clave.
           - Fecha actual de referencia: %s (Zona horaria: Lima, Perú).
        """.formatted(LocalDate.now(java.time.ZoneId.of("America/Lima")).toString());
    }

    private JsonNode callOpenRouterWithFailover(Map<String, Object> body) throws Exception {
        List<String> keyPool = getOrderedKeyPool();
        if (keyPool.isEmpty()) {
            throw new IllegalStateException("No se encontraron claves de OpenRouter configuradas.");
        }

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
                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    return objectMapper.readTree(response.body());
                }

                if (response.statusCode() == 429 || response.statusCode() == 401 || response.statusCode() == 402 || response.statusCode() == 403) {
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
                .id(UUID.randomUUID().toString())
                .role("assistant")
                .content("### Copiloto Académico UTP\n" + note + "\nPuedes consultar directamente tu horario en la pestaña **Horario Semanal**.")
                .timestamp(LocalDateTime.now())
                .metadata(Map.of("fallback", true))
                .build();
    }
}
