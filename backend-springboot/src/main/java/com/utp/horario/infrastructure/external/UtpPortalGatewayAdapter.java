package com.utp.horario.infrastructure.external;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.utp.horario.domain.model.exceptions.AuthenticationException;
import com.utp.horario.domain.model.exceptions.ResourceNotFoundException;
import com.utp.horario.domain.model.exceptions.UpstreamServiceException;
import com.utp.horario.domain.model.value_objects.ClassSession;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import com.utp.horario.domain.model.value_objects.SyllabusCorrelation;
import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import com.utp.horario.domain.model.value_objects.CourseEvaluationDetailDto;
import com.utp.horario.domain.model.value_objects.CourseSummaryDto;
import com.utp.horario.domain.model.value_objects.UpcomingEvaluationDto;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Cliente HTTP para consumir la API Externa Institucional (Heroku).
 * Desacopla 100% el backend del scraping de UTP, operando como un consumidor estÃ¡ndar de API REST.
 */
@Slf4j
@Component
public class UtpPortalGatewayAdapter implements IUtpPortalGateway {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String gatewayBaseUrl;

    /** Ruta del árbol completo de la sección en la pasarela institucional. */
    @Value("${academic.gateway.section-full-path:/sections/{sectionId}/full}")
    private String sectionFullPath = "/sections/{sectionId}/full";

    public UtpPortalGatewayAdapter(
            @Value("${academic.gateway.url:https://utp-academic-gateway-c0da87808dcb.herokuapp.com/api/v1}") String gatewayBaseUrl) {
        this.gatewayBaseUrl = gatewayBaseUrl.replaceAll("/+$", "");
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(15))
                .build();
        this.objectMapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .registerModule(new JavaTimeModule());
        log.info("[UtpPortalGatewayAdapter] Inicializado consumiendo API Externa en: {}", this.gatewayBaseUrl);
    }

    /**
     * Ejecuta la peticion y propaga fielmente el estado HTTP de la pasarela.
     * Ningun error se degrada a una respuesta vacia exitosa.
     */
    private HttpResponse<String> sendChecked(HttpRequest request) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status == 401 || status == 403) {
                throw new AuthenticationException("La pasarela institucional rechazo las credenciales (HTTP " + status + ").");
            }
            if (status == 404) {
                throw new ResourceNotFoundException("La pasarela institucional no encontro el recurso solicitado (HTTP 404).");
            }
            if (status >= 500) {
                throw new UpstreamServiceException("La pasarela institucional no esta disponible (HTTP " + status + ").");
            }
            if (status != 200) {
                throw new UpstreamServiceException("Respuesta inesperada de la pasarela institucional (HTTP " + status + ").");
            }
            return response;
        } catch (IOException e) {
            throw new UpstreamServiceException("Error de red al contactar la pasarela institucional: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new UpstreamServiceException("Llamada interrumpida a la pasarela institucional.", e);
        }
    }

    /** Exige un token de sesion para las operaciones autenticadas. */
    private String bearer(String token) {
        if (token == null || token.isBlank()) {
            throw new AuthenticationException("Se requiere token de sesion institucional UTP para esta operacion.");
        }
        return token.startsWith("Bearer ") ? token : "Bearer " + token;
    }

    @Override
    public StudentProfile login(String username, String password) {
        log.info("[UtpPortalGatewayAdapter] Autenticando contra la pasarela institucional: {}", username);
        try {
            String jsonBody = objectMapper.writeValueAsString(new LoginPayload(username, password));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(gatewayBaseUrl + "/auth/login"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = sendChecked(request);
            JsonNode root = objectMapper.readTree(response.body());
            if (root.hasNonNull("data")) {
                return objectMapper.treeToValue(root.get("data"), StudentProfile.class);
            }
            throw new UpstreamServiceException("La pasarela no devolvio el perfil autenticado.");
        } catch (AuthenticationException | ResourceNotFoundException | UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new UpstreamServiceException("Error al autenticar con la pasarela UTP: " + e.getMessage(), e);
        }
    }

    @Override
    public ScheduleInterval fetchSchedule(String token, String period) {
        log.info("[UtpPortalGatewayAdapter] Consultando horario a la API Externa (period='{}')", period);
        String encodedPeriod = URLEncoder.encode(period != null ? period : "2026 - Ciclo 2 Agosto", StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(gatewayBaseUrl + "/schedule?period=" + encodedPeriod))
                .timeout(Duration.ofSeconds(15))
                .header("Accept", "application/json")
                .header("Authorization", bearer(token))
                .GET()
                .build();
        try {
            HttpResponse<String> response = sendChecked(request);
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode data = root.path("data");
            if (data.isMissingNode() || data.isNull()) {
                throw new UpstreamServiceException("La pasarela no devolvio el horario oficial del periodo.");
            }
            return objectMapper.treeToValue(data, ScheduleInterval.class);
        } catch (AuthenticationException | ResourceNotFoundException | UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new UpstreamServiceException("Error al procesar el horario de la pasarela: " + e.getMessage(), e);
        }
    }

    @Override
    public List<TaskSyncItem> fetchActivities(String token, String intervalMode, Integer week, String status, Boolean onlyGraded, String type) {
        String auth = bearer(token);
        List<String> queryParams = new ArrayList<>();
        if (intervalMode != null && !intervalMode.isBlank()) {
            queryParams.add("intervalMode=" + URLEncoder.encode(intervalMode.trim(), StandardCharsets.UTF_8));
        }
        if (week != null && week > 0) {
            queryParams.add("week=" + week);
        }
        if (status != null && !status.isBlank()) {
            queryParams.add("status=" + URLEncoder.encode(status.trim(), StandardCharsets.UTF_8));
        }
        if (onlyGraded != null) {
            queryParams.add("onlyGraded=" + onlyGraded);
        }
        if (type != null && !type.isBlank()) {
            queryParams.add("type=" + URLEncoder.encode(type.trim(), StandardCharsets.UTF_8));
        }
        String queryString = queryParams.isEmpty() ? "" : "?" + String.join("&", queryParams);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(gatewayBaseUrl + "/tasks/activities" + queryString))
                .timeout(Duration.ofSeconds(15))
                .header("Accept", "application/json")
                .header("Authorization", auth)
                .GET()
                .build();
        try {
            HttpResponse<String> response = sendChecked(request);
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode data = root.path("data");
            if (!data.isArray()) {
                throw new UpstreamServiceException("La pasarela no devolvio el arreglo de actividades oficiales.");
            }
            List<TaskSyncItem> items = new ArrayList<>();
            for (JsonNode n : data) {
                String rawFinishAt = n.path("finishAt").asText(null);
                if (rawFinishAt == null) {
                    rawFinishAt = n.path("dueAt").asText(null);
                }
                LocalDateTime due = ClassSession.parseDateTimeSafely(rawFinishAt);
                String itemStatus = n.path("studentStatus").asText(n.path("status").asText("PENDING"));
                boolean isDelivered = "DELIVERED".equalsIgnoreCase(itemStatus)
                        || "DELIVERED_ON_TIME".equalsIgnoreCase(itemStatus)
                        || "SUBMITTED".equalsIgnoreCase(itemStatus);
                String evalSystem = n.hasNonNull("evaluationSystem") ? n.path("evaluationSystem").asText() : null;
                boolean isQualified = n.path("isQualified").asBoolean(false);
                String category = n.path("classificationCategory").asText("");
                String urgency = n.path("urgency").asText("");
                Integer daysRem = n.hasNonNull("daysRemaining") ? n.path("daysRemaining").asInt() : null;
                String actType = n.path("activityType").asText(n.path("type").asText("HOMEWORK"));
                String courseCode = n.hasNonNull("courseCode") ? n.path("courseCode").asText() : n.path("courseId").asText("");

                SyllabusCorrelation correlation = null;
                if (n.hasNonNull("syllabusCorrelation")) {
                    JsonNode sc = n.get("syllabusCorrelation");
                    correlation = SyllabusCorrelation.builder()
                            .courseCode(sc.path("courseCode").asText(courseCode))
                            .evaluationType(sc.path("evaluationType").asText(null))
                            .weightPercent(sc.hasNonNull("weightPercent") ? sc.path("weightPercent").asInt() : null)
                            .evaluationDescription(sc.path("evaluationDescription").asText(null))
                            .syllabusWeek(sc.hasNonNull("syllabusWeek") ? sc.path("syllabusWeek").asInt() : null)
                            .syllabusUnit(sc.path("syllabusUnit").asText(null))
                            .syllabusTopic(sc.path("syllabusTopic").asText(null))
                            .isSyllabusMatched(sc.path("isSyllabusMatched").asBoolean(false))
                            .syllabusUrl(sc.path("syllabusUrl").asText(null))
                            .syllabusMarkdownUrl(sc.path("syllabusMarkdownUrl").asText(null))
                            .build();
                }

                items.add(TaskSyncItem.builder()
                        .id(n.path("id").asText(n.path("activityId").asText()))
                        .courseName(n.path("courseName").asText(""))
                        .courseCode(courseCode)
                        .courseId(n.path("courseId").asText(""))
                        .sectionId(n.path("sectionId").asText(""))
                        .contentId(n.path("contentId").asText(""))
                        .homeworkId(n.path("activityId").asText(n.path("id").asText()))
                        .title(n.path("title").asText())
                        .type(actType)
                        .week(n.path("weekNumber").asInt(n.path("week").asInt(week != null ? week : 1)))
                        .homeworkStatus(itemStatus)
                        .assignmentProgress(isDelivered ? "FINISHED" : "NOT_STARTED")
                        .dueDate(due)
                        .deliveredDate(null)
                        .maxScore(n.path("evaluationTopScore").asDouble(20.0))
                        .score(null)
                        .isDelivered(isDelivered)
                        .evaluationSystem(evalSystem)
                        .isQualified(isQualified)
                        .classificationCategory(category)
                        .urgency(urgency)
                        .daysRemaining(daysRem)
                        .syllabusCorrelation(correlation)
                        .build());
            }
            return items;
        } catch (AuthenticationException | ResourceNotFoundException | UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new UpstreamServiceException("Error al procesar las actividades de la pasarela: " + e.getMessage(), e);
        }
    }

    @Override
    public List<TaskSyncItem> fetchSectionActivities(String token, String sectionId,
                                                      String courseCode, String courseName) {
        if (sectionId == null || sectionId.isBlank()) {
            throw new IllegalArgumentException("Se requiere sectionId para consultar el árbol de contenidos.");
        }
        String auth = bearer(token);
        String path = sectionFullPath.replace("{sectionId}",
                URLEncoder.encode(sectionId.trim(), StandardCharsets.UTF_8));
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(gatewayBaseUrl + path))
                .timeout(Duration.ofSeconds(15))
                .header("Accept", "application/json")
                .header("Authorization", auth)
                .GET()
                .build();
        try {
            HttpResponse<String> response = sendChecked(request);
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode data = root.hasNonNull("data") ? root.get("data") : root;
            return parseSectionTree(data, sectionId, courseCode, courseName);
        } catch (AuthenticationException | ResourceNotFoundException | UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new UpstreamServiceException(
                    "Error al procesar el árbol de contenidos de la sección " + sectionId + ": " + e.getMessage(), e);
        }
    }

    /**
     * Deserializa {@code unities[] -> themes[] -> contents[]} sin asumir identificadores ni títulos.
     * Solo se conservan entregables o actividades evaluativas; el resto del árbol se descarta.
     * Paquete-privado para permitir pruebas unitarias del parser sin red.
     */
    static List<TaskSyncItem> parseSectionTree(JsonNode data, String sectionId,
                                               String courseCode, String courseName) {
        if (data == null || data.isNull()) {
            throw new UpstreamServiceException("La pasarela no devolvió datos del árbol de la sección.");
        }
        JsonNode unities = data.path("unities");
        if (!unities.isArray()) {
            // Algunas versiones de la pasarela envían las unidades directamente en "data".
            unities = data.isArray() ? data : null;
        }
        if (unities == null || !unities.isArray()) {
            throw new UpstreamServiceException("El árbol de la sección no contiene 'unities[]'.");
        }

        List<TaskSyncItem> items = new ArrayList<>();
        for (JsonNode unity : unities) {
            JsonNode themes = unity.path("themes");
            for (JsonNode theme : themes) {
                Integer week = theme.hasNonNull("weekNumber")
                        ? theme.get("weekNumber").asInt()
                        : (theme.hasNonNull("week") ? theme.get("week").asInt() : null);
                JsonNode contents = theme.path("contents");
                for (JsonNode content : contents) {
                    JsonNode meta = content.path("metadata");
                    String type = content.path("type").asText("");
                    String evalSystem = firstText(meta.path("evaluationSystem"), content.path("evaluationSystem"));
                    boolean isQualified = meta.path("isQualified").asBoolean(false)
                            || content.path("isQualified").asBoolean(false);
                    if (!isEvaluativeContent(type, evalSystem, isQualified)) {
                        continue;
                    }
                    String contentId = firstText(meta.path("contentId"), content.path("contentId"), content.path("id"));
                    String title = firstText(content.path("title"), meta.path("title"));
                    String visibleTo = firstText(meta.path("visibleTo"), content.path("visibleTo"),
                            meta.path("finishAt"), content.path("finishAt"));
                    String status = firstText(meta.path("studentStatus"), meta.path("homeworkStatus"));
                    boolean delivered = "DELIVERED".equalsIgnoreCase(status)
                            || "SUBMITTED".equalsIgnoreCase(status)
                            || "DELIVERED_ON_TIME".equalsIgnoreCase(status);

                    items.add(TaskSyncItem.builder()
                            .id(contentId)
                            .contentId(contentId)
                            .homeworkId(contentId)
                            .studentId(null)
                            .courseCode(courseCode)
                            .courseName(courseName)
                            .sectionId(sectionId)
                            .title(title)
                            .type(type)
                            .week(week)
                            .homeworkStatus(status != null ? status : "PENDING")
                            .assignmentProgress(delivered ? "FINISHED" : "NOT_STARTED")
                            .dueDate(ClassSession.parseDateTimeSafely(visibleTo))
                            .isDelivered(delivered)
                            .isQualified(isQualified)
                            .evaluationSystem(evalSystem)
                            .build());
                }
            }
        }
        return items;
    }

    private static boolean isEvaluativeContent(String type, String evalSystem, boolean isQualified) {
        String normalized = type == null ? "" : type.trim().toUpperCase();
        return "HOMEWORK".equals(normalized)
                || "EVALUATION".equals(normalized)
                || "FORUM".equals(normalized)
                || isQualified
                || (evalSystem != null && !evalSystem.isBlank());
    }

    private static String firstText(JsonNode... candidates) {
        for (JsonNode candidate : candidates) {
            if (candidate != null && candidate.isValueNode() && !candidate.asText().isBlank()) {
                return candidate.asText();
            }
        }
        return null;
    }

    @Override
    public List<TaskSyncItem> fetchTasks(String token, String sectionId) {
        return fetchActivities(token, null, null, null, null, null);
    }

    @Override
    public List<TaskSyncItem> fetchActivitiesByWeek(String token, Integer week) {
        return fetchActivities(token, null, week, null, null, null);
    }

    @Override
    public JsonNode fetchTaskDetail(String token, String sectionId, String activityId) {
        String path = "/tasks/" + URLEncoder.encode(sectionId != null ? sectionId.trim() : "", StandardCharsets.UTF_8)
                + "/" + URLEncoder.encode(activityId != null ? activityId.trim() : "", StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(gatewayBaseUrl + path))
                .timeout(Duration.ofSeconds(15))
                .header("Accept", "application/json")
                .header("Authorization", bearer(token))
                .GET()
                .build();
        try {
            HttpResponse<String> response = sendChecked(request);
            JsonNode root = objectMapper.readTree(response.body());
            if (root.hasNonNull("data") && root.path("success").asBoolean(true)) {
                return root.get("data");
            }
            throw new UpstreamServiceException("La pasarela no devolvio el detalle de la tarea " + activityId + ".");
        } catch (AuthenticationException | ResourceNotFoundException | UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new UpstreamServiceException("Error al procesar el detalle de la tarea: " + e.getMessage(), e);
        }
    }

    @Override
    public List<CourseSummaryDto> fetchCoursesSummary(String token) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(gatewayBaseUrl + "/courses/summary"))
                .timeout(Duration.ofSeconds(15))
                .header("Accept", "application/json")
                .header("Authorization", bearer(token))
                .GET()
                .build();
        try {
            HttpResponse<String> response = sendChecked(request);
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode dataNode = root.path("data");
            JsonNode coursesNode = (dataNode.has("courses") && dataNode.path("courses").isArray())
                    ? dataNode.path("courses")
                    : (dataNode.isArray() ? dataNode : null);
            if (coursesNode == null || !coursesNode.isArray()) {
                throw new UpstreamServiceException("La pasarela no devolvio el resumen de cursos oficial.");
            }
            List<CourseSummaryDto> list = new ArrayList<>();
            for (JsonNode c : coursesNode) {
                List<CourseEvaluationDetailDto> evals = new ArrayList<>();
                JsonNode evalsNode = c.path("evaluations");
                if (evalsNode.isArray()) {
                    for (JsonNode ev : evalsNode) {
                        evals.add(new CourseEvaluationDetailDto(
                                ev.path("shortName").asText(""),
                                ev.path("name").asText(""),
                                ev.path("value").asText(""),
                                ev.path("isGraded").asBoolean(false)
                        ));
                    }
                }
                Integer credits = null;
                if (c.hasNonNull("credits")) {
                    try {
                        credits = (int) Math.round(Double.parseDouble(c.path("credits").asText().trim()));
                    } catch (Exception ignored) {
                        // Un credito no numerico se reporta como ausente, nunca inventado.
                    }
                }
                list.add(new CourseSummaryDto(
                        c.path("courseId").asText(""),
                        c.path("courseCode").asText(""),
                        c.path("courseName").asText(""),
                        c.path("formula").asText(""),
                        c.path("teacher").asText(""),
                        credits,
                        evals
                ));
            }
            return list;
        } catch (AuthenticationException | ResourceNotFoundException | UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new UpstreamServiceException("Error al procesar el resumen de cursos: " + e.getMessage(), e);
        }
    }

    @Override
    public List<UpcomingEvaluationDto> fetchUpcomingEvaluations(String token, int limit) {
        int effectiveLimit = limit > 0 ? limit : 5;
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(gatewayBaseUrl + "/tasks/upcoming?limit=" + effectiveLimit))
                .timeout(Duration.ofSeconds(15))
                .header("Accept", "application/json")
                .header("Authorization", bearer(token))
                .GET()
                .build();
        try {
            HttpResponse<String> response = sendChecked(request);
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode dataNode = root.path("data");
            if (!dataNode.isArray()) {
                throw new UpstreamServiceException("La pasarela no devolvio las evaluaciones proximas.");
            }
            List<UpcomingEvaluationDto> list = new ArrayList<>();
            for (JsonNode n : dataNode) {
                list.add(new UpcomingEvaluationDto(
                        n.path("id").asText(""),
                        n.path("title").asText(""),
                        n.path("activityType").asText(""),
                        n.path("weekNumber").asInt(1),
                        n.path("startAt").asText(""),
                        n.path("finishAt").asText(""),
                        n.path("courseName").asText(""),
                        n.path("courseId").asText(""),
                        n.path("sectionId").asText(""),
                        n.path("activityId").asText(""),
                        n.path("evaluationSystem").asText(null),
                        n.path("studentStatus").asText(""),
                        n.path("isQualified").asBoolean(false),
                        n.path("classificationCategory").asText(""),
                        n.path("urgency").asText(""),
                        n.path("daysRemaining").asInt(0)
                ));
            }
            return list;
        } catch (AuthenticationException | ResourceNotFoundException | UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new UpstreamServiceException("Error al procesar las evaluaciones proximas: " + e.getMessage(), e);
        }
    }

    @Override
    public String fetchSyllabusMarkdown(String token, String courseCode) {
        String encodedCode = URLEncoder.encode(courseCode != null ? courseCode : "", StandardCharsets.UTF_8);
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(gatewayBaseUrl + "/syllabus/" + encodedCode + "/markdown"))
                .timeout(Duration.ofSeconds(15))
                .header("Accept", "text/markdown");
        // Sin credenciales se permite unicamente la lectura de la cache publica.
        // Con credenciales, un 401 se propaga y nunca se reintenta de forma anonima.
        if (token != null && !token.isBlank()) {
            builder.header("Authorization", token.startsWith("Bearer ") ? token : "Bearer " + token);
        }
        return sendChecked(builder.GET().build()).body();
    }

    @Override
    public String exportCalendarIcs(String token, String period) {
        String encodedPeriod = URLEncoder.encode(period != null ? period : "2026 - Ciclo 2 Agosto", StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(gatewayBaseUrl + "/schedule/export.ics?period=" + encodedPeriod))
                .timeout(Duration.ofSeconds(20))
                .header("Accept", "text/calendar, text/plain, */*")
                .header("Authorization", bearer(token))
                .GET()
                .build();
        return sendChecked(request).body();
    }

    @Override
    public Syllabus fetchSyllabus(String token, String courseCode, String sectionId, String pdfUrl) {
        StringBuilder urlBuilder = new StringBuilder(gatewayBaseUrl)
                .append("/syllabus/")
                .append(URLEncoder.encode(courseCode != null ? courseCode.trim() : "", StandardCharsets.UTF_8));
        List<String> queryParams = new ArrayList<>();
        if (sectionId != null && !sectionId.isBlank()) {
            queryParams.add("sectionId=" + URLEncoder.encode(sectionId.trim(), StandardCharsets.UTF_8));
        }
        if (pdfUrl != null && !pdfUrl.isBlank()) {
            queryParams.add("pdfUrl=" + URLEncoder.encode(pdfUrl.trim(), StandardCharsets.UTF_8));
        }
        if (!queryParams.isEmpty()) {
            urlBuilder.append("?").append(String.join("&", queryParams));
        }
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(urlBuilder.toString()))
                .timeout(Duration.ofSeconds(90))
                .header("Accept", "application/json");
        // v46: acceso anonimo de solo cache permitido; cabecera invalida presente => 401.
        if (token != null && !token.isBlank()) {
            builder.header("Authorization", token.startsWith("Bearer ") ? token : "Bearer " + token);
        }
        try {
            HttpResponse<String> response = sendChecked(builder.GET().build());
            JsonNode root = objectMapper.readTree(response.body());
            if (!root.hasNonNull("data")) {
                throw new UpstreamServiceException("La pasarela no devolvio el silabo oficial de " + courseCode + ".");
            }
            return objectMapper.treeToValue(root.get("data"), Syllabus.class);
        } catch (AuthenticationException | ResourceNotFoundException | UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new UpstreamServiceException("Error al procesar el silabo oficial: " + e.getMessage(), e);
        }
    }

    @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
    private static class LoginPayload {
        public final String username;
        public final String password;

        public LoginPayload(String username, String password) {
            this.username = username;
            this.password = password;
        }
    }
}

