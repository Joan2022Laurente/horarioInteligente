package com.utp.horario.infraestructure.external;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.value_objets.AiChatMessage;
import com.utp.horario.domain.model.value_objets.ClassSession;
import com.utp.horario.domain.model.value_objets.Course;
import com.utp.horario.domain.model.value_objets.ScheduleInterval;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.value_objets.SyllabusEvaluation;
import com.utp.horario.domain.model.value_objets.SyllabusWeeklySession;
import com.utp.horario.domain.model.repositories.ILlmGateway;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Component
public class OpenRouterGatewayAdapter implements ILlmGateway {

    @Value("${app.openrouter.api-url:https://openrouter.ai/api/v1/chat/completions}")
    private String apiUrl;

    @Value("${app.openrouter.api-key:}")
    private String configuredApiKey;

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

    private final OpenRouterModelSelector modelSelector;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public OpenRouterGatewayAdapter(OpenRouterModelSelector modelSelector) {
        this.modelSelector = modelSelector;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_2)
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Obtiene el pool de llaves activas cargadas estrictamente desde variables de entorno.
     * Cero llaves hardcodeadas en cÃ³digo fuente.
     */
    private List<String> getOrderedKeyPool() {
        List<String> pool = new ArrayList<>();

        // 1. Prioridad 1: Claves individuales numeradas (2, 3, 4, 5) desde entorno o properties
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

        // 2. Lista separada por comas OPENROUTER_API_KEYS
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

        // 3. Claves numeradas 1 a 10
        for (int i = 1; i <= 10; i++) {
            addIfValid(pool, System.getenv("OPENROUTER_API_KEY_" + i));
            addIfValid(pool, System.getProperty("OPENROUTER_API_KEY_" + i));
        }

        // 4. Clave principal / estÃ¡ndar
        addIfValid(pool, configuredApiKey);
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
    public AiChatMessage queryModel(
            String prompt,
            ScheduleInterval schedule,
            Map<String, Syllabus> syllabi) {
        return queryModel(prompt, schedule, syllabi, null);
    }

    @Override
    public AiChatMessage queryModel(
            String prompt,
            ScheduleInterval schedule,
            Map<String, Syllabus> syllabi,
            String requestedModel) {

        int week = 7;
        if (schedule != null && schedule.getWeekNumber() != null && schedule.getWeekNumber() > 0) {
            week = schedule.getWeekNumber();
        } else if (schedule != null && schedule.getStartDate() != null) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(schedule.getStartDate(), LocalDate.now());
            week = Math.max(1, Math.min(18, (int) (days / 7) + 1));
        }

        String systemContext = buildSystemPrompt(schedule, syllabi, week);

        // SelecciÃ³n inteligente de modelo, jerarquÃ­a y temperatura basada en intenciÃ³n (estilo bajoNivel)
        OpenRouterModelSelector.SelectionResult selection = modelSelector.selectOptimalModel(prompt, requestedModel);

        List<String> keys = getOrderedKeyPool();
        if (keys.isEmpty()) {
            log.warn("[OpenRouterGatewayAdapter] âš ï¸ No se detectaron API keys de OpenRouter en variables de entorno. Activando contingencia sintÃ¡ctica.");
            return generateResilientResponse(prompt, schedule, syllabi, week);
        }

        try {
            LlmCallResult result = callOpenRouterWithFailover(systemContext, prompt, selection, keys);
            if (result != null && result.content() != null && !result.content().isBlank()) {
                return AiChatMessage.builder()
                        .id(UUID.randomUUID().toString())
                        .role("assistant")
                        .content(result.content().trim())
                        .timestamp(LocalDateTime.now())
                        .suggestions(List.of("Â¿QuÃ© clase me toca hoy?", "Ver evaluaciones del ciclo", "Â¿CÃ³mo calculo mi promedio?"))
                        .metadata(Map.of(
                                "modelUsed", result.modelUsed(),
                                "intentDetected", selection.detectedIntent().name(),
                                "provider", "OpenRouter AI",
                                "keyIndexUsed", result.keyIndex()
                        ))
                        .build();
            }
        } catch (Exception e) {
            log.warn("[OpenRouterGatewayAdapter] âš ï¸ Error durante ejecuciÃ³n del LLM: {}", e.getMessage());
        }

        // Fallback dinÃ¡mico contextual si todos los modelos o llaves fallan o demoran
        return generateResilientResponse(prompt, schedule, syllabi, week);
    }

    private record LlmCallResult(String content, String modelUsed, int keyIndex) {}

    private LlmCallResult callOpenRouterWithFailover(
            String systemPrompt,
            String userMessage,
            OpenRouterModelSelector.SelectionResult selection,
            List<String> keys) {

        List<String> targetModels = new ArrayList<>();
        if (selection.primaryModel() != null && !selection.primaryModel().isBlank()) {
            targetModels.add(selection.primaryModel());
        }
        if (selection.modelsHierarchy() != null) {
            for (String m : selection.modelsHierarchy()) {
                if (!targetModels.contains(m)) targetModels.add(m);
            }
        }
        if (targetModels.isEmpty()) {
            targetModels.add("openrouter/free");
        }

        List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userMessage)
        );

        for (String currentModel : targetModels) {
            Map<String, Object> bodyMap = new HashMap<>();
            bodyMap.put("model", currentModel);
            bodyMap.put("provider", Map.of("allow_fallbacks", true));
            bodyMap.put("reasoning", Map.of("max_tokens", 0));
            bodyMap.put("temperature", selection.temperature());
            bodyMap.put("max_tokens", 800);
            bodyMap.put("messages", messages);

            String jsonPayload;
            try {
                jsonPayload = objectMapper.writeValueAsString(bodyMap);
            } catch (Exception e) {
                log.error("[OpenRouterGatewayAdapter] Error serializando payload: {}", e.getMessage());
                return null;
            }

            for (int i = 0; i < keys.size(); i++) {
                String apiKey = keys.get(i);
                String maskedKey = apiKey.length() > 15 ? apiKey.substring(0, 15) + "..." : "key";
                long t0 = System.currentTimeMillis();
                try {
                    log.info("[OpenRouterGatewayAdapter] ðŸš€ Probando inferencia con Modelo: {} | Key #{}/{} ({})",
                            currentModel, i + 1, keys.size(), maskedKey);

                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(apiUrl))
                            .timeout(Duration.ofSeconds(12))
                            .header("Authorization", "Bearer " + apiKey)
                            .header("Content-Type", "application/json")
                            .header("HTTP-Referer", "https://horario-inteligente-utp.edu.pe")
                            .header("X-Title", "Horario Inteligente UTP")
                            .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                            .build();

                    HttpResponse<String> response = httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                            .get(14, java.util.concurrent.TimeUnit.SECONDS);
                    long elapsed = System.currentTimeMillis() - t0;

                    if (response.statusCode() == 200) {
                        JsonNode root = objectMapper.readTree(response.body());
                        if (root.hasNonNull("error")) {
                            log.warn("[OpenRouterGatewayAdapter] âš ï¸ Error upstream de modelo {} en HTTP 200: {}. Rotando modelo...",
                                    currentModel, root.path("error").path("message").asText());
                            break; // Pasar al siguiente modelo de la jerarquÃ­a
                        }
                        JsonNode choices = root.path("choices");
                        if (choices.isArray() && !choices.isEmpty()) {
                            JsonNode contentNode = choices.get(0).path("message").path("content");
                            if (contentNode == null || contentNode.isNull() || contentNode.asText().isBlank() || "null".equalsIgnoreCase(contentNode.asText().trim())) {
                                log.warn("[OpenRouterGatewayAdapter] âš ï¸ Modelo {} devolviÃ³ contenido vacÃ­o o null. Rotando...", currentModel);
                                break;
                            }
                            String text = contentNode.asText();
                            String actualModel = root.path("model").asText(currentModel);
                            if (text.startsWith("User Safety:") || actualModel.contains("safety") || actualModel.contains("moderation") || actualModel.contains("guard")) {
                                log.warn("[OpenRouterGatewayAdapter] âš ï¸ Modelo de moderaciÃ³n/safety detectado ({}). Rotando al siguiente modelo...", actualModel);
                                break;
                            }
                            String sanitizedText = cleanThinkingTraces(text);
                            log.info("[OpenRouterGatewayAdapter] âœ… Respuesta exitosa en {}ms de OpenRouter | Modelo servido: {} | Key #{}",
                                    elapsed, actualModel, i + 1);
                            return new LlmCallResult(sanitizedText, actualModel, i + 1);
                        }
                    } else if (response.statusCode() == 429 || response.statusCode() == 402) {
                        log.warn("[OpenRouterGatewayAdapter] âš ï¸ Modelo {} congestionado o Key #{}/{} agotada (HTTP {}). Rotando modelo inmediatamente...",
                                currentModel, i + 1, keys.size(), response.statusCode());
                        break; // Rotar inmediatamente de modelo ante congestiÃ³n de tasa
                    } else if (response.statusCode() == 401 || response.statusCode() == 403) {
                        log.warn("[OpenRouterGatewayAdapter] âš ï¸ Key #{}/{} ({}) no autorizada (HTTP {}). Rotando a la siguiente llave...",
                                i + 1, keys.size(), maskedKey, response.statusCode());
                    } else {
                        log.warn("[OpenRouterGatewayAdapter] âš ï¸ HTTP {} para modelo {}: {}. Rotando modelo...",
                                response.statusCode(), currentModel, response.body());
                        break; // Si el modelo responde 404 o error estructural, pasar al siguiente modelo
                    }
                } catch (Exception e) {
                    log.warn("[OpenRouterGatewayAdapter] âš ï¸ Error/timeout ({}ms) con Key #{}/{} en modelo {}: {}",
                            (System.currentTimeMillis() - t0), i + 1, maskedKey, currentModel, e.getMessage());
                    break; // Si hay timeout en el modelo, rotar de modelo inmediatamente sin quemar todas las llaves en el mismo modelo
                }
            }
        }
        return null;
    }

    private String cleanThinkingTraces(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String cleaned = raw.replaceAll("(?s)<think>.*?</think>", "").trim();
        if (cleaned.contains("</think>")) {
            cleaned = cleaned.substring(cleaned.lastIndexOf("</think>") + 8).trim();
        }
        String lower = cleaned.toLowerCase(Locale.ROOT);
        if (lower.startsWith("here's a thinking process:")
                || lower.startsWith("here is a thinking process:")
                || lower.startsWith("1.  **analyze user input:")
                || lower.startsWith("1. **analyze user input:")) {
            // Si el modelo volcÃ³ un proceso de razonamiento completo, buscar el Ãºltimo quiebre hacia la respuesta real
            int lastSection = cleaned.lastIndexOf("\n\n");
            if (lastSection != -1 && lastSection < cleaned.length() - 2) {
                cleaned = cleaned.substring(lastSection + 2).trim();
            }
        }
        return cleaned;
    }

    private String buildSystemPrompt(ScheduleInterval schedule, Map<String, Syllabus> syllabi, int week) {
        StringBuilder sb = new StringBuilder();
        sb.append("Eres el Copiloto AcadÃ©mico de la UTP (Universidad TecnolÃ³gica del PerÃº), un asistente universitario inteligente de Ã©lite.\n");
        sb.append("Tienes acceso COMPLETO y en tiempo real al horario oficial, cursos, docentes, aulas y sÃ­labos del estudiante.\n");
        sb.append("DIRECTIVA CRÃTICA: Prohibido incluir procesos de pensamiento (thinking process, reasoning tokens), borradores o anÃ¡lisis en inglÃ©s. Responde ÃšNICAMENTE en espaÃ±ol de forma directa, cÃ¡lida y final al estudiante.\n");
        sb.append("Tu tono es empÃ¡tico, profesional, motivador, claro y conciso. Emplea formato Markdown con viÃ±etas, tablas o negritas cuando sea Ãºtil.\n\n");

        // Zona horaria oficial de PerÃº
        ZonedDateTime nowLima = ZonedDateTime.now(ZoneId.of("America/Lima"));
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM 'de' yyyy", new Locale("es", "PE"));

        sb.append("### INFORMACIÃ“N TEMPORAL EN VIVO:\n");
        sb.append("- Fecha actual (PerÃº): ").append(nowLima.format(dateFmt)).append("\n");
        sb.append("- Hora actual: ").append(nowLima.format(timeFmt)).append("\n");
        sb.append("- Semana acadÃ©mica del ciclo: Semana ").append(week).append("\n\n");

        List<com.utp.horario.domain.model.value_objets.ClassSession> todayClasses = new ArrayList<>();

        if (schedule != null) {
            if (schedule.getCourses() != null && !schedule.getCourses().isEmpty()) {
                sb.append("### CURSOS MATRICULADOS:\n");
                for (com.utp.horario.domain.model.value_objets.Course c : schedule.getCourses()) {
                    sb.append("- **").append(c.getName()).append("** (CÃ³digo: ").append(c.getCode())
                            .append(", SecciÃ³n: ").append(c.getSection())
                            .append(c.getTeacher() != null ? ", Docente: " + c.getTeacher() : "")
                            .append(")\n");
                }
                sb.append("\n");
            }

            if (schedule.getClasses() != null && !schedule.getClasses().isEmpty()) {
                sb.append("### SESIONES DE CLASE PROGRAMADAS EN EL HORARIO:\n");
                DayOfWeek todayDow = nowLima.getDayOfWeek();
                LocalTime currentTime = nowLima.toLocalTime();
                LocalDate todayDate = nowLima.toLocalDate();

                com.utp.horario.domain.model.value_objets.ClassSession nextClass = null;

                Set<String> seenGridSlots = new java.util.HashSet<>();
                Set<String> seenTodaySlots = new java.util.HashSet<>();

                for (com.utp.horario.domain.model.value_objets.ClassSession cs : schedule.getClasses()) {
                    if (cs.getStartAt() == null) continue;

                    // Identificar si la sesiÃ³n es hoy
                    boolean isToday = cs.getStartAt().getDayOfWeek() == todayDow
                            || (cs.getStartAt().toLocalDate() != null && cs.getStartAt().toLocalDate().isEqual(todayDate));

                    if (isToday) {
                        String todaySlotKey = cs.getCourseName() + "_" + cs.getStartAt().toLocalTime();
                        if (seenTodaySlots.add(todaySlotKey)) {
                            todayClasses.add(cs);
                            if (cs.getFinishAt() != null && cs.getFinishAt().toLocalTime().isAfter(currentTime)) {
                                if (nextClass == null || cs.getStartAt().isBefore(nextClass.getStartAt())) {
                                    nextClass = cs;
                                }
                            }
                        }
                    }

                    // Grilla semanal compacta (una Ãºnica entrada por slot recurrente)
                    String gridSlotKey = cs.getStartAt().getDayOfWeek() + "_" + cs.getCourseName() + "_" + cs.getStartAt().toLocalTime();
                    if (!seenGridSlots.add(gridSlotKey)) {
                        continue;
                    }

                    String dayName = cs.getStartAt().getDayOfWeek().getDisplayName(TextStyle.FULL, new Locale("es", "PE"));
                    String startStr = cs.getStartAt().format(timeFmt);
                    String finishStr = cs.getFinishAt() != null ? cs.getFinishAt().format(timeFmt) : "Fin no especificado";

                    sb.append("- [").append(dayName.toUpperCase()).append(" ").append(startStr).append(" - ").append(finishStr).append("] ")
                            .append("**").append(cs.getCourseName()).append("**")
                            .append(" | Aula: ").append(cs.getClassroom() != null ? cs.getClassroom() : "Sin aula")
                            .append(" | Torre/Piso: ").append(cs.getBuilding() != null ? cs.getBuilding() : "Campus")
                            .append(cs.getFloor() != null ? " Piso " + cs.getFloor() : "")
                            .append(" | Modalidad: ").append(cs.getModality() != null ? cs.getModality() : "Presencial")
                            .append(cs.getTeacher() != null ? " | Docente: " + cs.getTeacher() : "")
                            .append("\n");
                }
                sb.append("\n");

                // PrÃ³xima clase cronolÃ³gica en el calendario (sea hoy o en dÃ­as prÃ³ximos)
                com.utp.horario.domain.model.value_objets.ClassSession nextUpcomingClass = nextClass;
                String nextUpcomingDayName = "";
                if (nextUpcomingClass == null && !schedule.getClasses().isEmpty()) {
                    int minDaysDiff = 999;
                    LocalTime minStartTime = LocalTime.MAX;

                    for (com.utp.horario.domain.model.value_objets.ClassSession cs : schedule.getClasses()) {
                        if (cs.getStartAt() == null) continue;
                        int csDow = cs.getStartAt().getDayOfWeek().getValue();
                        int todayDowVal = todayDow.getValue();
                        int daysDiff = (csDow - todayDowVal + 7) % 7;

                        // Si es hoy pero ya pasÃ³ la hora de inicio, pertenece a la siguiente semana (+7 dÃ­as)
                        if (daysDiff == 0 && cs.getStartAt().toLocalTime().isBefore(currentTime)) {
                            daysDiff = 7;
                        }

                        if (daysDiff > 0) {
                            LocalTime csTime = cs.getStartAt().toLocalTime();
                            if (daysDiff < minDaysDiff || (daysDiff == minDaysDiff && csTime.isBefore(minStartTime))) {
                                minDaysDiff = daysDiff;
                                minStartTime = csTime;
                                nextUpcomingClass = cs;
                                nextUpcomingDayName = cs.getStartAt().getDayOfWeek().getDisplayName(TextStyle.FULL, new Locale("es", "PE"));
                            }
                        }
                    }
                }

                sb.append("### ESTADO DE CLASES DE HOY (").append(todayDow.getDisplayName(TextStyle.FULL, new Locale("es", "PE")).toUpperCase()).append("):\n");
                if (todayClasses.isEmpty()) {
                    sb.append("Hoy no tienes clases programadas en tu horario oficial. Es un excelente momento para avanzar tareas o estudiar.\n\n");
                } else {
                    boolean allFinished = true;
                    com.utp.horario.domain.model.value_objets.ClassSession lastClass = null;

                    for (com.utp.horario.domain.model.value_objets.ClassSession tc : todayClasses) {
                        String st = tc.getStartAt().format(timeFmt);
                        String fn = tc.getFinishAt() != null ? tc.getFinishAt().format(timeFmt) : "";
                        boolean isPast = tc.getFinishAt() != null && tc.getFinishAt().toLocalTime().isBefore(currentTime);
                        boolean isCurrent = tc.getStartAt().toLocalTime().isBefore(currentTime) && (tc.getFinishAt() == null || tc.getFinishAt().toLocalTime().isAfter(currentTime));
                        String status = isCurrent ? "ðŸŸ¢ EN CURSO AHORA" : (isPast ? "âšª FINALIZADA" : "ðŸŸ¡ PENDIENTE MÃS TARDE");

                        if (!isPast) allFinished = false;
                        if (lastClass == null || (tc.getFinishAt() != null && tc.getFinishAt().toLocalTime().isAfter(lastClass.getFinishAt().toLocalTime()))) {
                            lastClass = tc;
                        }

                        sb.append("- ").append(status).append(": **").append(tc.getCourseName()).append("** (")
                                .append(st).append(" a ").append(fn).append("), Aula: ").append(tc.getClassroom())
                                .append(", Docente: ").append(tc.getTeacher() != null ? tc.getTeacher() : "Docente asignado")
                                .append("\n");
                    }

                    if (allFinished) {
                        sb.append("\n* AVISO DE HORARIO: Todas las clases programadas para hoy (")
                                .append(todayDow.getDisplayName(TextStyle.FULL, new Locale("es", "PE")))
                                .append(") ya han FINALIZADO");
                        if (lastClass != null) {
                            sb.append(" (la Ãºltima fue **").append(lastClass.getCourseName()).append("** que culminÃ³ a las ")
                                    .append(lastClass.getFinishAt() != null ? lastClass.getFinishAt().format(timeFmt) : "").append(")");
                        }
                        sb.append(".\n");
                    }

                    if (nextUpcomingClass != null) {
                        String targetDay = nextUpcomingDayName.isBlank() ? "hoy" : nextUpcomingDayName.toLowerCase();
                        sb.append("* PRÃ“XIMA CLASE PROGRAMADA EN EL HORARIO: **")
                                .append(nextUpcomingClass.getCourseName()).append("** el dÃ­a ").append(targetDay)
                                .append(" de ").append(nextUpcomingClass.getStartAt().format(timeFmt))
                                .append(" a ").append(nextUpcomingClass.getFinishAt() != null ? nextUpcomingClass.getFinishAt().format(timeFmt) : "")
                                .append(" en el aula ").append(nextUpcomingClass.getClassroom())
                                .append(", Docente: ").append(nextUpcomingClass.getTeacher() != null ? nextUpcomingClass.getTeacher() : "Docente oficial")
                                .append(".\n\n");
                    }
                }
            }
        }

        // Temas especÃ­ficos de los cursos del horario (Hoy y PrÃ³ximas clases)
        if (syllabi != null && !syllabi.isEmpty()) {
            sb.append("### TEMAS DEL SÃLABO PARA LAS CLASES DE HOY Y PRÃ“XIMAS (SEMANA ").append(week).append("):\n");
            java.util.Set<String> processedCourses = new java.util.HashSet<>();

            // 1. Priorizar clases de hoy
            for (com.utp.horario.domain.model.value_objets.ClassSession tc : todayClasses) {
                if (tc.getCourseName() == null || processedCourses.contains(tc.getCourseName().toLowerCase())) continue;
                processedCourses.add(tc.getCourseName().toLowerCase());
                appendCourseTopic(sb, tc.getCourseName(), tc.getCourseCode(), syllabi, week);
            }

            // 2. Incluir demÃ¡s clases del horario semanal
            if (schedule != null && schedule.getClasses() != null) {
                for (com.utp.horario.domain.model.value_objets.ClassSession cs : schedule.getClasses()) {
                    if (cs.getCourseName() == null || processedCourses.contains(cs.getCourseName().toLowerCase())) continue;
                    processedCourses.add(cs.getCourseName().toLowerCase());
                    appendCourseTopic(sb, cs.getCourseName(), cs.getCourseCode(), syllabi, week);
                }
            }
            sb.append("\n");
        }

        // SÃ­labos, fÃ³rmulas y temarios generales
        if (syllabi != null && !syllabi.isEmpty()) {
            sb.append("### SÃLABOS, FÃ“RMULAS DE EVALUACIÃ“N Y TEMAS POR CURSO:\n");
            syllabi.forEach((code, syl) -> {
                String cName = syl.getCourseName() != null ? syl.getCourseName() : code;
                String cCode = syl.getCourseCode() != null ? syl.getCourseCode() : code;
                sb.append("#### ").append(cName).append(" (").append(cCode).append("):\n");
                if (syl.getFormula() != null && !syl.getFormula().isBlank()) {
                    sb.append("- FÃ³rmula de Promedio Final: `").append(syl.getFormula()).append("`\n");
                }
                if (syl.getEvaluations() != null && !syl.getEvaluations().isEmpty()) {
                    sb.append("- Evaluaciones: ");
                    syl.getEvaluations().forEach(ev -> {
                        String name = ev.getType() != null ? ev.getType() : (ev.getDescription() != null ? ev.getDescription() : "EvaluaciÃ³n");
                        sb.append(name).append(" (Semana ").append(ev.getWeek()).append(", Peso ").append(ev.getWeightPercent()).append("%) ");
                    });
                    sb.append("\n");
                }
                if (syl.getWeeklySchedule() != null) {
                    final int targetWeek = week;
                    syl.getWeeklySchedule().stream()
                            .filter(ws -> ws.getWeek() != null && ws.getWeek() == targetWeek)
                            .findFirst()
                            .ifPresent(ws -> sb.append("- Tema de la Semana ").append(targetWeek).append(": ").append(ws.getTopic()).append("\n"));
                }
            });
            sb.append("\n");
        }

        sb.append("INSTRUCCIONES CLAVE DE RESPUESTA:\n");
        sb.append("1. Si te preguntan 'Â¿quÃ© clases tengo hoy?', 'Â¿cuÃ¡l es mi prÃ³xima clase?' o 'Â¿quÃ© temas tocan en mi prÃ³xima clase?':\n");
        sb.append("   - Si las clases de hoy ya concluyeron (aparecen como FINALIZADA), indÃ­caselo con amabilidad y precisiÃ³n: 'Las clases de hoy ya finalizaron (la Ãºltima fue [Ãšltima Clase]). Tu PRÃ“XIMA clase segÃºn tu horario es [PrÃ³xima Clase] el dÃ­a [DÃ­a] a las [Hora] en el aula [Aula] con el docente [Docente], donde verÃ¡n el tema: [Tema del sÃ­labo]'.\n");
        sb.append("   - Si hay una clase pendiente o en curso hoy, responde directamente indicando curso, aula, hora y sus temas.\n");
        sb.append("   - NUNCA digas 'Lo siento, no tengo informaciÃ³n sobre tu prÃ³ximo curso especÃ­fico', porque TIENES su horario oficial completo y todos los sÃ­labos en este mismo contexto.\n");
        sb.append("2. Si te preguntan 'Â¿quÃ© temas tocarÃ¡n hoy?' o 'Â¿quÃ© temas tocan esta semana?', RESPONDE DIRECTAMENTE con el tema y unidad del sÃ­labo detallados arriba para cada clase de hoy (o de la semana). Explica los temas de forma clara y entusiasta.\n");
        sb.append("3. Si te preguntan por fÃ³rmulas o notas, usa la fÃ³rmula exacta del curso que estÃ¡ en el contexto.\n");
        sb.append("4. Si no hay clases hoy, avÃ­sale explÃ­citamente y menciona cuÃ¡ndo es su siguiente clase segÃºn las sesiones del horario.\n");

        return sb.toString();
    }

    private void appendCourseTopic(StringBuilder sb, String cName, String cCode, Map<String, Syllabus> syllabi, int week) {
        com.utp.horario.domain.model.aggregate.Syllabus foundSyl = null;
        for (com.utp.horario.domain.model.aggregate.Syllabus s : syllabi.values()) {
            if (s == null) continue;
            String sName = s.getCourseName() != null ? s.getCourseName().toLowerCase() : "";
            String sCode = s.getCourseCode() != null ? s.getCourseCode().toLowerCase() : "";
            String targetName = cName != null ? cName.toLowerCase() : "";
            String targetCode = cCode != null ? cCode.toLowerCase() : "";
            if ((!sCode.isBlank() && sCode.equals(targetCode)) || (!sName.isBlank() && (sName.contains(targetName) || targetName.contains(sName)))) {
                foundSyl = s;
                break;
            }
        }
        if (foundSyl != null && foundSyl.getWeeklySchedule() != null) {
            final int targetWeek = week;
            foundSyl.getWeeklySchedule().stream()
                    .filter(ws -> ws.getWeek() != null && ws.getWeek() == targetWeek)
                    .findFirst()
                    .ifPresent(ws -> {
                        sb.append("- Para **").append(cName).append("**: Unidad '")
                                .append(ws.getUnit() != null ? ws.getUnit() : "General")
                                .append("' | Tema: **").append(ws.getTopic() != null ? ws.getTopic() : "Contenido semanal")
                                .append("**");
                        if (ws.getActivities() != null && !ws.getActivities().isBlank()) {
                            sb.append(" | Actividad: ").append(ws.getActivities());
                        }
                        sb.append("\n");
                    });
        }
    }

    private AiChatMessage generateResilientResponse(
            String prompt,
            ScheduleInterval schedule,
            Map<String, Syllabus> syllabi,
            int week) {
        String cleanPrompt = prompt != null ? prompt.toLowerCase() : "";
        StringBuilder sb = new StringBuilder();

        if (cleanPrompt.contains("tema") || cleanPrompt.contains("slabo") || cleanPrompt.contains("silabo") || cleanPrompt.contains("unidad") || cleanPrompt.contains("contenido")) {
            sb.append("### Temario Acadmico (Semana ").append(week).append("):\n\n");
            if (syllabi != null && !syllabi.isEmpty()) {
                syllabi.forEach((code, syl) -> {
                    String name = syl.getCourseName() != null ? syl.getCourseName() : code;
                    sb.append("#### **").append(name).append("**\n");
                    if (syl.getWeeklySchedule() != null) {
                        final int targetWeek = week;
                        syl.getWeeklySchedule().stream()
                                .filter(ws -> ws.getWeek() != null && ws.getWeek() == targetWeek)
                                .findFirst()
                                .ifPresentOrElse(
                                        ws -> sb.append("- **Unidad:** ").append(ws.getUnit() != null ? ws.getUnit() : "General")
                                                .append("\n- **Tema:** ").append(ws.getTopic() != null ? ws.getTopic() : "Contenido de la semana")
                                                .append(ws.getActivities() != null && !ws.getActivities().isBlank() ? "\n- **Actividades:** " + ws.getActivities() : "")
                                                .append("\n\n"),
                                        () -> sb.append("- Contenido programado en plataforma virtual para la semana ").append(targetWeek).append(".\n\n")
                                );
                    }
                });
            } else {
                sb.append("Puedes revisar los temas detallados de cada unidad ingresando a la pestaa **Cursos**.\n");
            }
        } else if (cleanPrompt.contains("clase") || cleanPrompt.contains("toca") || cleanPrompt.contains("horario")) {
            sb.append("### Resumen de Clases (Semana ").append(week).append("):\n");
            if (schedule != null && schedule.getClasses() != null && !schedule.getClasses().isEmpty()) {
                ZonedDateTime nowLima = ZonedDateTime.now(ZoneId.of("America/Lima"));
                DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
                DayOfWeek todayDow = nowLima.getDayOfWeek();
                List<com.utp.horario.domain.model.value_objets.ClassSession> todayClasses = schedule.getClasses().stream()
                        .filter(cs -> cs.getStartAt() != null && cs.getStartAt().getDayOfWeek() == todayDow)
                        .toList();

                if (todayClasses.isEmpty()) {
                    sb.append("Hoy no tienes clases programadas en tu horario oficial. Â¡Aprovecha para repasar tus cursos!\n");
                } else {
                    sb.append("Hoy tienes las siguientes sesiones:\n");
                    java.util.Set<String> seenSessions = new java.util.LinkedHashSet<>();
                    for (com.utp.horario.domain.model.value_objets.ClassSession tc : todayClasses) {
                        String st = tc.getStartAt().format(timeFmt);
                        String fn = tc.getFinishAt() != null ? tc.getFinishAt().format(timeFmt) : "";
                        String key = tc.getCourseName() + "|" + st + "|" + fn;
                        if (seenSessions.add(key)) {
                            sb.append("- **").append(tc.getCourseName()).append("**: ")
                                    .append(st).append(" - ").append(fn)
                                    .append(" (Aula: ").append(tc.getClassroom() != null ? tc.getClassroom() : "Sin aula").append(")\n");
                        }
                    }
                }
            } else {
                sb.append("- Revisa tu pestaÃ±a de **Hoy** y **Horario** para ver tus aulas y sesiones programadas.\n");
            }
        } else if (cleanPrompt.contains("examen") || cleanPrompt.contains("evaluaci") || cleanPrompt.contains("pc") || cleanPrompt.contains("promedio") || cleanPrompt.contains("porcentaje")) {
            sb.append("### PrÃ³ximas Evaluaciones y Porcentajes Oficiales (Semana actual: ").append(week).append("):\n\n");
            if (syllabi != null && !syllabi.isEmpty()) {
                syllabi.forEach((code, syl) -> {
                    String name = syl.getCourseName() != null ? syl.getCourseName() : code;
                    sb.append("#### **").append(name).append("**\n");
                    if (syl.getFormula() != null && !syl.getFormula().isBlank()) {
                        sb.append("- **FÃ³rmula de Promedio**: `").append(syl.getFormula()).append("`\n");
                    }
                    if (syl.getEvaluations() != null && !syl.getEvaluations().isEmpty()) {
                        sb.append("- **Sistema de CalificaciÃ³n**:\n");
                        syl.getEvaluations().stream()
                                .sorted(java.util.Comparator.comparingInt(e -> e.getWeek() != null ? e.getWeek() : 99))
                                .forEach(ev -> {
                                    String evName = ev.getType() != null ? ev.getType() : "EvaluaciÃ³n";
                                    String evDesc = ev.getDescription() != null ? " (" + ev.getDescription() + ")" : "";
                                    String marker = (ev.getWeek() != null && ev.getWeek() >= week) ? "ðŸ“ " : "âœ“ ";
                                    sb.append("  ").append(marker).append("**").append(evName).append("**").append(evDesc)
                                            .append(" â€” Semana ").append(ev.getWeek() != null ? ev.getWeek() : "?")
                                            .append(" (Peso: **").append(ev.getWeightPercent()).append("%**)\n");
                                });
                    }
                    sb.append("\n");
                });
            } else {
                sb.append("- Las evaluaciones de cada ciclo incluyen PrÃ¡cticas Calificadas (PC), Avances de Proyecto (APF) y Examen Final.\n");
                sb.append("- Puedes revisar el detalle exacto de rÃºbricas y porcentajes en la pestaÃ±a **Cursos** de tu plataforma.\n");
            }
        } else {
            sb.append("Hola, soy tu **Copiloto AcadÃ©mico UTP**.\n");
            sb.append("Estoy conectado a tu horario en vivo de la **Semana ").append(week).append("**.\n");
            sb.append("Â¿En quÃ© puedo orientarte hoy? Puedes consultarme sobre tus clases, preparaciÃ³n para evaluaciones o fÃ³rmulas de calificaciÃ³n.");
        }

        return AiChatMessage.builder()
                .id(UUID.randomUUID().toString())
                .role("assistant")
                .content(sb.toString())
                .timestamp(LocalDateTime.now())
                .suggestions(List.of("Â¿QuÃ© clase me toca hoy?", "Ver evaluaciones", "Consejos de estudio"))
                .metadata(Map.of("modelUsed", "local-resilient-assistant"))
                .build();
    }
}

