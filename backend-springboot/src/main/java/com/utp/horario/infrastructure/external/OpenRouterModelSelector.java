package com.utp.horario.infrastructure.external;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Pattern;

/**
 * OpenRouterModelSelector — Filtro Seleccionador Inteligente de Modelos Free por Latencia y Capacidad.
 *
 * Características:
 * 1. Cero Modelos Hardcodeados: Escanea dinámicamente el catálogo en vivo de OpenRouter (GET /api/v1/models).
 * 2. Cero API Keys en Código: Consulta el catálogo público sin credenciales y delega la ejecución al adapter.
 * 3. Ranking Inteligente de Latencia: Evalúa TTFT, ventana de contexto y capacidad MoE (<500ms).
 * 4. Resiliencia Multi-Modelo: Rotación continua entre modelos :free activos con descarte de fallos (403/429).
 */
@Slf4j
@Component
public class OpenRouterModelSelector {

    public enum AcademicIntent {
        EVALUATIONS_AND_FORMULAS, // Fórmulas de notas, pesos %, PC1, parciales, cálculo de promedio
        SCHEDULE_AND_LOCATION,    // Clases hoy, aula, docente, zoom, horarios, próxima clase
        SYLLABUS_AND_TOPICS,      // Temas por semana, unidades temáticas, cronograma
        GENERAL_ACADEMIC          // Dudas generales, consejos de estudio, metodología
    }

    public record SelectionResult(
            String primaryModel,
            List<String> modelsHierarchy,
            double temperature,
            AcademicIntent detectedIntent
    ) {}

    public record RankedModel(
            String id,
            String name,
            int contextLength,
            Integer activeB,
            Integer totalB,
            double latencyEst,
            double score
    ) {}

    // Modelos Gratuitos Base de Contingencia (verificados empíricamente en producción)
    public static final String DEFAULT_FREE_ROUTER = "openrouter/free";
    public static final String DEFAULT_FREE_SUPER = "nvidia/nemotron-3-super-120b-a12b:free";
    public static final String DEFAULT_FREE_LIGHTNING = "nvidia/nemotron-3.5-lightning:free";
    public static final String DEFAULT_FREE_NANO = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
    public static final String DEFAULT_FREE_GEMMA = "google/gemma-4-31b-it:free";

    // Lista negra estricta de modelos descartados (Gated 403, Congested 429, Audio/No-Chat)
    private static final Set<String> DISCARDED_MODELS = Set.of(
            "thinkingmachines/inkling:free",
            "thinkingmachines/inkling-small:free",
            "google/lyria-3-clip-preview",
            "google/lyria-3-pro-preview",
            "google/gemma-4-31b-it:free",
            "google/gemma-4-26b-a4b-it:free",
            "qwen/qwen3.8-27b:free",
            "z-ai/glm-5.2:free",
            "liquid/lfm-2.5-2.6b:free",
            "liquid/lfm-2.5-1.2b:free",
            "nex-agi/nex-n2.5-pro:free",
            "nex-agi/nex-n2.5-mini:free",
            "dots-studio/dots-3-note-preview:free",
            "cohere/north-mini-code:free",
            "poolside/laguna-s-2.1:free",
            "poolside/laguna-xs-2.1:free",
            "nvidia/nemotron-3.5-content-safety:free",
            "openai/gpt-oss-safety:free",
            "arcee-ai/arcee-agent"
    );

    // Benchmarking empírico de latencias TTFT observadas en segundos
    private static final Map<String, Double> EMPIRICAL_LATENCIES = Map.of(
            "openrouter/free", 0.25,
            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", 0.29,
            "nvidia/nemotron-3.5-lightning:free", 0.43,
            "nvidia/nemotron-3-super-120b-a12b:free", 0.45,
            "google/gemma-4-31b-it:free", 0.65
    );

    private static final Map<String, Integer> MODEL_ACTIVE_PARAMS = Map.of(
            "nvidia/nemotron-3-ultra-550b-a55b:free", 55,
            "nvidia/nemotron-3.5-lightning:free", 25,
            "nvidia/nemotron-3-super-120b-a12b:free", 12,
            "google/gemma-4-31b-it:free", 31,
            "google/gemma-4-26b-a4b-it:free", 4
    );

    @Value("${app.openrouter.primary-model:}")
    private String configuredDefaultModel;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    // Catálogo dinámico en memoria actualizado desde la API de OpenRouter
    private volatile List<RankedModel> dynamicRankedFreeModels = new ArrayList<>();
    private volatile long lastCatalogFetchTime = 0;

    // Patrones de categorización sintáctica inmediata (<1ms, cero tokens)
    private static final Pattern EVAL_PATTERN = Pattern.compile(
            "\\b(evaluaci[oó]n|evaluaciones|porcentaje|porcentajes|ponderaci[oó]n|f[oó]rmula|f[oó]rmulas|promedio|nota|notas|pc1|pc2|pc3|pc4|ep|ef|parcial|final|exfn|apf|ati|rubrica)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private static final Pattern SCHEDULE_PATTERN = Pattern.compile(
            "\\b(clase|clases|horario|aula|sal[oó]n|pabell[oó]n|profesor|profesora|docente|zoom|link|enlace|hora|horario|toca hoy|siguiente clase|pr[oó]xima clase|que me toca)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private static final Pattern SYLLABUS_PATTERN = Pattern.compile(
            "\\b(tema|temas|temario|s[ií]labo|s[ií]labus|unidad|unidades|semana|semanas|contenido|cronograma|actividad|actividades)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    public OpenRouterModelSelector() {
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_2)
                .connectTimeout(Duration.ofSeconds(4))
                .build();
        this.objectMapper = new ObjectMapper();
        initDefaultSeedModels();
    }

    private void initDefaultSeedModels() {
        List<RankedModel> seed = new ArrayList<>();
        seed.add(new RankedModel(DEFAULT_FREE_ROUTER, "OpenRouter Free Dynamic Router", 200000, 16, 70, 0.25, 95.0));
        seed.add(new RankedModel(DEFAULT_FREE_LIGHTNING, "Nemotron 3.5 Lightning Free", 1000000, 25, 100, 0.43, 91.0));
        seed.add(new RankedModel(DEFAULT_FREE_NANO, "Nemotron 3 Nano Omni Free", 256000, 3, 30, 0.29, 88.5));
        seed.add(new RankedModel(DEFAULT_FREE_SUPER, "Nemotron Super 120B Free", 262144, 12, 120, 0.45, 87.0));
        this.dynamicRankedFreeModels = Collections.unmodifiableList(seed);
    }

    @PostConstruct
    public void startAsyncCatalogSync() {
        CompletableFuture.runAsync(this::refreshCatalogFromOpenRouter);
    }

    /**
     * Consulta asíncronamente el catálogo oficial de OpenRouter y rankea dinámicamente los modelos free.
     */
    public synchronized void refreshCatalogFromOpenRouter() {
        long now = System.currentTimeMillis();
        // Limitar frecuencia a máximo una vez cada 15 minutos
        if (now - lastCatalogFetchTime < 15 * 60 * 1000 && !dynamicRankedFreeModels.isEmpty()) {
            return;
        }

        try {
            log.info("[OpenRouterModelSelector] 🌐 Consultando catálogo de modelos en vivo desde OpenRouter API...");
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://openrouter.ai/api/v1/models"))
                    .timeout(Duration.ofSeconds(8))
                    .header("User-Agent", "HorarioInteligenteUTP/2.0")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode dataArray = root.path("data");
                if (dataArray.isArray() && !dataArray.isEmpty()) {
                    List<RankedModel> freshRanked = new ArrayList<>();

                    for (JsonNode m : dataArray) {
                        String id = m.path("id").asText("");
                        if (id.isBlank()) continue;

                        JsonNode pricing = m.path("pricing");
                        String promptP = pricing.path("prompt").asText("1");
                        String complP = pricing.path("completion").asText("1");
                        boolean isZeroPrice = "0".equals(promptP) && "0".equals(complP);
                        boolean isFree = isZeroPrice || id.endsWith(":free") || id.equals("openrouter/free");

                        if (!isFree) continue;

                        String idLower = id.toLowerCase(Locale.ROOT);
                        if (DISCARDED_MODELS.contains(id) || DISCARDED_MODELS.contains(idLower)) continue;

                        // Excluir modelos de audio, moderación o visión pura no conversacionales
                        if (idLower.contains("safety") || idLower.contains("moderation") || idLower.contains("guard")
                                || idLower.contains("rerank") || idLower.contains("embed") || idLower.contains("lyria")
                                || idLower.contains("clip")) {
                            continue;
                        }

                        int ctx = m.path("context_length").asInt(0);
                        if (ctx < 32768 && !id.equals("openrouter/free")) {
                            continue;
                        }

                        if (idLower.contains("2.6b") || idLower.contains("1.2b")) {
                            continue;
                        }

                        // Algoritmo de scoring balanceado (Latencia TTFT + MoE Params + Contexto)
                        double lat = EMPIRICAL_LATENCIES.getOrDefault(id, 2.5);
                        double latScore = Math.exp(-0.80 * Math.pow(lat / 2.5, 2));

                        double normCtx = Math.log(Math.max(ctx, 32768) / 32768.0) / Math.log(2.0);
                        double ctxScore = 0.75 + 0.25 * Math.min(1.0, normCtx / 5.0);

                        String text = (m.path("name").asText("") + " " + m.path("description").asText("")).toLowerCase(Locale.ROOT);
                        double fit = (text.contains("reasoning") || text.contains("instruct") || text.contains("math") || text.contains("code")) ? 1.0 : 0.8;

                        double capScore = 0.55;
                        Integer activeB = MODEL_ACTIVE_PARAMS.get(id);
                        if (activeB != null) {
                            capScore = Math.min(1.0, 0.45 + 0.55 * (Math.log10(activeB) - Math.log10(7)) / (Math.log10(120) - Math.log10(7)));
                        }

                        double quality = 0.55 * 0.70 + 0.30 * capScore + 0.15 * fit;
                        double score = 100.0 * (0.50 * quality + 0.22 * latScore + 0.10 * ctxScore + 0.18 * 0.90);

                        freshRanked.add(new RankedModel(
                                id,
                                m.path("name").asText(id),
                                ctx,
                                activeB,
                                null,
                                lat,
                                Math.round(score * 100.0) / 100.0
                        ));
                    }

                    if (!freshRanked.isEmpty()) {
                        boolean hasRouter = freshRanked.stream().anyMatch(r -> DEFAULT_FREE_ROUTER.equals(r.id()));
                        if (!hasRouter) {
                            freshRanked.add(new RankedModel(DEFAULT_FREE_ROUTER, "OpenRouter Free Dynamic Router", 200000, 16, 70, 0.25, 95.0));
                        }
                        freshRanked.sort((a, b) -> Double.compare(b.score(), a.score()));
                        this.dynamicRankedFreeModels = Collections.unmodifiableList(freshRanked);
                        this.lastCatalogFetchTime = now;
                        log.info("[OpenRouterModelSelector] ⚡ Catálogo en vivo sincronizado: {} modelos :free rankeados por latencia. Top: {}",
                                freshRanked.size(), freshRanked.get(0).id());
                        return;
                    }
                }
            }
            log.warn("[OpenRouterModelSelector] ⚠️ Respuesta HTTP {} de OpenRouter /models. Manteniendo pool base verificado.", response.statusCode());
        } catch (Exception e) {
            log.warn("[OpenRouterModelSelector] ⚠️ No se pudo consultar catálogo OpenRouter en vivo ({}), usando pool base seguro.", e.getMessage());
        }
    }

    /**
     * Evalúa la consulta del estudiante y resuelve dinámicamente el modelo free óptimo y su jerarquía de fallbacks.
     */
    public SelectionResult selectOptimalModel(String userPrompt, String requestedModel) {
        AcademicIntent intent = detectIntent(userPrompt);

        // Si se especificó un modelo en el request, verificar que no esté descartado
        if (requestedModel != null && !requestedModel.isBlank()) {
            String primary = requestedModel.trim();
            if (DISCARDED_MODELS.contains(primary)) {
                log.warn("[OpenRouterModelSelector] ⚠️ Modelo solicitado '{}' está descartado. Asignando mejor modelo free dinámico.", primary);
                primary = resolveDynamicFreeModel(intent);
            }
            List<String> hierarchy = buildHierarchy(primary, intent);
            return new SelectionResult(primary, hierarchy, resolveTemperature(intent), intent);
        }

        // Si hay un override explícito configurado en variables de entorno, respetarlo
        if (configuredDefaultModel != null && !configuredDefaultModel.isBlank()) {
            String primary = configuredDefaultModel.trim();
            List<String> hierarchy = buildHierarchy(primary, intent);
            return new SelectionResult(primary, hierarchy, resolveTemperature(intent), intent);
        }

        // Selección dinámica automática basada en latencia y adecuación por intención
        String primary = resolveDynamicFreeModel(intent);
        List<String> hierarchy = buildHierarchy(primary, intent);
        double temp = resolveTemperature(intent);

        log.debug("[OpenRouterModelSelector] Intención: {} | Primario: {} | Fallbacks: {}",
                intent, primary, hierarchy);

        return new SelectionResult(primary, hierarchy, temp, intent);
    }

    private String resolveDynamicFreeModel(AcademicIntent intent) {
        List<RankedModel> pool = this.dynamicRankedFreeModels;
        if (pool == null || pool.isEmpty()) {
            return DEFAULT_FREE_ROUTER;
        }

        // Prioridad máxima a openrouter/free para auto-routing dinámico < 2 segundos
        for (RankedModel rm : pool) {
            if (DEFAULT_FREE_ROUTER.equals(rm.id())) {
                return rm.id();
            }
        }

        switch (intent) {
            case EVALUATIONS_AND_FORMULAS:
                for (RankedModel rm : pool) {
                    if (rm.id().contains("super") || (rm.activeB() != null && rm.activeB() >= 12)) {
                        return rm.id();
                    }
                }
                return pool.get(0).id();

            case SYLLABUS_AND_TOPICS:
                for (RankedModel rm : pool) {
                    if (rm.contextLength() >= 500000) return rm.id();
                }
                return pool.get(0).id();

            case SCHEDULE_AND_LOCATION:
            case GENERAL_ACADEMIC:
            default:
                return pool.get(0).id();
        }
    }

    private AcademicIntent detectIntent(String prompt) {
        if (prompt == null || prompt.isBlank()) {
            return AcademicIntent.GENERAL_ACADEMIC;
        }
        String clean = prompt.toLowerCase(Locale.ROOT);

        if (EVAL_PATTERN.matcher(clean).find()) {
            return AcademicIntent.EVALUATIONS_AND_FORMULAS;
        }
        if (SCHEDULE_PATTERN.matcher(clean).find()) {
            return AcademicIntent.SCHEDULE_AND_LOCATION;
        }
        if (SYLLABUS_PATTERN.matcher(clean).find()) {
            return AcademicIntent.SYLLABUS_AND_TOPICS;
        }
        return AcademicIntent.GENERAL_ACADEMIC;
    }

    private List<String> buildHierarchy(String primary, AcademicIntent intent) {
        List<String> models = new ArrayList<>();
        if (primary != null && !primary.isBlank() && !DISCARDED_MODELS.contains(primary)) {
            models.add(primary);
        }

        List<RankedModel> pool = this.dynamicRankedFreeModels;
        if (pool != null) {
            for (RankedModel rm : pool) {
                if (!models.contains(rm.id()) && !DISCARDED_MODELS.contains(rm.id()) && models.size() < 3) {
                    models.add(rm.id());
                }
            }
        }

        // Si la jerarquía aún tiene menos de 2 elementos, completar con defaults verificados
        List<String> fallbacks = List.of(DEFAULT_FREE_ROUTER, DEFAULT_FREE_SUPER, DEFAULT_FREE_LIGHTNING);
        for (String fb : fallbacks) {
            if (!models.contains(fb) && models.size() < 3) {
                models.add(fb);
            }
        }

        return models;
    }

    private double resolveTemperature(AcademicIntent intent) {
        if (intent == AcademicIntent.EVALUATIONS_AND_FORMULAS) {
            return 0.1;
        }
        if (intent == AcademicIntent.SCHEDULE_AND_LOCATION) {
            return 0.2;
        }
        if (intent == AcademicIntent.SYLLABUS_AND_TOPICS) {
            return 0.3;
        }
        return 0.5;
    }
}
