package com.utp.horario.infrastructure.external;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.utp.horario.domain.model.ClassSession;
import com.utp.horario.domain.model.ScheduleInterval;
import com.utp.horario.domain.model.StudentProfile;
import com.utp.horario.domain.model.TaskSyncItem;
import com.utp.horario.domain.port.out.UtpPortalGatewayPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Cliente HTTP para consumir la API Externa Institucional (Heroku).
 * Desacopla 100% el backend del scraping de UTP, operando como un consumidor estándar de API REST.
 */
@Slf4j
@Component
public class UtpPortalGatewayAdapter implements UtpPortalGatewayPort {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String gatewayBaseUrl;

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

    @Override
    public StudentProfile login(String username, String password) {
        log.info("[UtpPortalGatewayAdapter] Solicitando autenticación a la API Externa para: {}", username);
        try {
            String jsonBody = objectMapper.writeValueAsString(new LoginPayload(username, password));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(gatewayBaseUrl + "/auth/login"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("[UtpPortalGatewayAdapter] Respuesta auth/login statusCode={}", response.statusCode());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                if (root.path("success").asBoolean(true) && root.hasNonNull("data")) {
                    JsonNode data = root.get("data");
                    StudentProfile profile = objectMapper.treeToValue(data, StudentProfile.class);
                    log.info("[UtpPortalGatewayAdapter] ✅ Autenticación exitosa en API Externa para [{}] - Nombre: '{}', Carrera: '{}', Ciclo: {}",
                            username, profile.getFullName(), profile.getCareer(), profile.getCurrentCycle());
                    return profile;
                }
            }

            JsonNode root = objectMapper.readTree(response.body());
            String errorMsg = root.hasNonNull("error") ? root.path("error").asText() : "Credenciales UTP inválidas o servicio no disponible.";
            log.warn("[UtpPortalGatewayAdapter] ❌ API Externa rechazó login para {}: {}", username, errorMsg);
            throw new IllegalArgumentException(errorMsg);
        } catch (IllegalArgumentException iae) {
            throw iae;
        } catch (Exception e) {
            log.error("[UtpPortalGatewayAdapter] Error al autenticar con API Externa: {}", e.getMessage());
            throw new RuntimeException("Error en autenticación UTP: " + e.getMessage());
        }
    }

    @Override
    public ScheduleInterval fetchSchedule(String token, String period) {
        log.info("[UtpPortalGatewayAdapter] Consultando horario a la API Externa (period='{}')", period);
        try {
            String encodedPeriod = URLEncoder.encode(period != null ? period : "2026 - Ciclo 2 Agosto", StandardCharsets.UTF_8);
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(gatewayBaseUrl + "/schedule?period=" + encodedPeriod))
                    .timeout(Duration.ofSeconds(15))
                    .header("Accept", "application/json")
                    .GET();

            if (token != null && !token.isBlank()) {
                reqBuilder.header("Authorization", token.startsWith("Bearer ") ? token : "Bearer " + token);
            }

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode data = root.path("data");
                if (!data.isMissingNode() && !data.isNull()) {
                    return objectMapper.treeToValue(data, ScheduleInterval.class);
                }
            }
        } catch (Exception e) {
            log.error("[UtpPortalGatewayAdapter] Error al obtener horario de API Externa: {}", e.getMessage());
        }

        return ScheduleInterval.builder()
                .id("interval-empty")
                .periodName(period != null ? period : "2026 - Ciclo 2 Agosto")
                .weekNumber(1)
                .totalWeeks(18)
                .startDate(LocalDate.parse("2026-08-17"))
                .endDate(LocalDate.parse("2026-12-20"))
                .classes(new ArrayList<>())
                .courses(new ArrayList<>())
                .build();
    }

    @Override
    public List<TaskSyncItem> fetchTasks(String token, String sectionId) {
        if (token == null || token.isBlank()) {
            return new ArrayList<>();
        }
        log.info("[UtpPortalGatewayAdapter] Consultando actividades/tareas a API Externa...");
        try {
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(gatewayBaseUrl + "/tasks/activities"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Accept", "application/json")
                    .header("Authorization", token.startsWith("Bearer ") ? token : "Bearer " + token)
                    .GET();

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode data = root.path("data");
                if (data.isArray()) {
                    List<TaskSyncItem> items = new ArrayList<>();
                    for (JsonNode n : data) {
                        String rawFinishAt = n.path("finishAt").asText(null);
                        LocalDateTime due = ClassSession.parseDateTimeSafely(rawFinishAt);
                        String status = n.path("studentStatus").asText("PENDING");
                        boolean isDelivered = "DELIVERED".equalsIgnoreCase(status) || "DELIVERED_ON_TIME".equalsIgnoreCase(status);

                        items.add(TaskSyncItem.builder()
                                .id(n.path("id").asText(n.path("activityId").asText()))
                                .courseName(n.path("courseName").asText(""))
                                .sectionId(n.path("sectionId").asText(sectionId != null ? sectionId : ""))
                                .homeworkId(n.path("activityId").asText())
                                .title(n.path("title").asText())
                                .type(n.path("activityType").asText(n.path("classificationCategory").asText("HOMEWORK")))
                                .week(n.path("weekNumber").asInt(1))
                                .homeworkStatus(status)
                                .assignmentProgress(isDelivered ? "FINISHED" : "NOT_STARTED")
                                .dueDate(due)
                                .deliveredDate(null)
                                .maxScore(20.0)
                                .score(null)
                                .isDelivered(isDelivered)
                                .build());
                    }
                    log.info("[UtpPortalGatewayAdapter] ✅ {} tareas/actividades obtenidas de API Externa", items.size());
                    return items;
                }
            }
        } catch (Exception e) {
            log.error("[UtpPortalGatewayAdapter] Error consultando tareas de API Externa: {}", e.getMessage());
        }
        return new ArrayList<>();
    }

    @Override
    public String fetchSyllabusPdfText(String token, String courseCode) {
        log.info("[UtpPortalGatewayAdapter] Consultando sílabo a la API Externa para curso: {}", courseCode);
        try {
            String encodedCode = URLEncoder.encode(courseCode != null ? courseCode : "", StandardCharsets.UTF_8);
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(gatewayBaseUrl + "/syllabus/" + encodedCode))
                    .timeout(Duration.ofSeconds(15))
                    .header("Accept", "application/json")
                    .GET();

            if (token != null && !token.isBlank()) {
                reqBuilder.header("Authorization", token.startsWith("Bearer ") ? token : "Bearer " + token);
            }

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode data = root.path("data");
                if (!data.isMissingNode() && !data.isNull()) {
                    return data.toString();
                }
            }
        } catch (Exception e) {
            log.error("[UtpPortalGatewayAdapter] Error al obtener sílabo de API Externa: {}", e.getMessage());
        }
        return "";
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
