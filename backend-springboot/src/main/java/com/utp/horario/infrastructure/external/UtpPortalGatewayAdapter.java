package com.utp.horario.infrastructure.external;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.utp.horario.domain.model.ClassSession;
import com.utp.horario.domain.model.ScheduleInterval;
import com.utp.horario.domain.model.StudentProfile;
import com.utp.horario.domain.model.TaskSyncItem;
import com.utp.horario.domain.model.tool.AcademicToolDto.CourseEvaluationDetailDto;
import com.utp.horario.domain.model.tool.AcademicToolDto.CourseSummaryDto;
import com.utp.horario.domain.model.tool.AcademicToolDto.UpcomingEvaluationDto;
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
import java.util.concurrent.ConcurrentHashMap;

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
    private final ConcurrentHashMap<String, String> tokenCache = new ConcurrentHashMap<>();

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
    public void registerStudentToken(String studentCode, String token) {
        if (studentCode != null && !studentCode.isBlank() && token != null && !token.isBlank()) {
            String cleanToken = token.startsWith("Bearer ") ? token.substring(7).trim() : token.trim();
            tokenCache.put(studentCode.trim().toUpperCase(), cleanToken);
        }
    }

    @Override
    public String getStudentToken(String studentCode) {
        if (studentCode == null || studentCode.isBlank()) {
            return tokenCache.values().stream().findFirst().orElse(null);
        }
        String found = tokenCache.get(studentCode.trim().toUpperCase());
        if (found != null && !found.isBlank()) {
            return found;
        }
        return tokenCache.values().stream().findFirst().orElse(null);
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
                    if (profile.getToken() != null && !profile.getToken().isBlank()) {
                        registerStudentToken(profile.getStudentCode(), profile.getToken());
                    }
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
    public List<CourseSummaryDto> fetchCoursesSummary(String token) {
        if (token == null || token.isBlank()) {
            return List.of();
        }
        log.info("[UtpPortalGatewayAdapter] Consultando resumen oficial de cursos a API Externa (/courses/summary)...");
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(gatewayBaseUrl + "/courses/summary"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Accept", "application/json")
                    .header("Authorization", token.startsWith("Bearer ") ? token : "Bearer " + token)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode dataNode = root.path("data");
                JsonNode coursesNode = (dataNode.has("courses") && dataNode.path("courses").isArray())
                        ? dataNode.path("courses")
                        : (dataNode.isArray() ? dataNode : null);
                if (coursesNode != null && coursesNode.isArray()) {
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
                            } catch (Exception ignored) {}
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
                    log.info("[UtpPortalGatewayAdapter] ✅ {} cursos oficiales obtenidos de /courses/summary", list.size());
                    return list;
                }
            }
        } catch (Exception e) {
            log.error("[UtpPortalGatewayAdapter] Error consultando /courses/summary: {}", e.getMessage());
        }
        return List.of();
    }

    @Override
    public List<UpcomingEvaluationDto> fetchUpcomingEvaluations(String token, int limit) {
        if (token == null || token.isBlank()) {
            return List.of();
        }
        int effectiveLimit = limit > 0 ? limit : 5;
        log.info("[UtpPortalGatewayAdapter] Consultando evaluaciones próximas oficiales a API Externa (/tasks/upcoming?limit={})...", effectiveLimit);
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(gatewayBaseUrl + "/tasks/upcoming?limit=" + effectiveLimit))
                    .timeout(Duration.ofSeconds(15))
                    .header("Accept", "application/json")
                    .header("Authorization", token.startsWith("Bearer ") ? token : "Bearer " + token)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode dataNode = root.path("data");
                if (dataNode.isArray()) {
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
                    log.info("[UtpPortalGatewayAdapter] ✅ {} evaluaciones próximas obtenidas de /tasks/upcoming", list.size());
                    return list;
                }
            }
        } catch (Exception e) {
            log.error("[UtpPortalGatewayAdapter] Error consultando /tasks/upcoming: {}", e.getMessage());
        }
        return List.of();
    }

    @Override
    public String fetchSyllabusMarkdown(String token, String courseCode) {
        log.info("[UtpPortalGatewayAdapter] Consultando sílabo Markdown a API Externa para curso: {}", courseCode);
        try {
            String encodedCode = URLEncoder.encode(courseCode != null ? courseCode : "", StandardCharsets.UTF_8);
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(gatewayBaseUrl + "/syllabus/" + encodedCode + "/markdown"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Accept", "text/markdown")
                    .GET();

            if (token != null && !token.isBlank()) {
                reqBuilder.header("Authorization", token.startsWith("Bearer ") ? token : "Bearer " + token);
            }

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                return response.body();
            }
        } catch (Exception e) {
            log.error("[UtpPortalGatewayAdapter] Error consultando sílabo Markdown para {}: {}", courseCode, e.getMessage());
        }
        return "";
    }

    @Override
    public String exportCalendarIcs(String token, String period) {
        log.info("[UtpPortalGatewayAdapter] Exportando calendario iCalendar (.ics) desde API Externa...");
        try {
            String encodedPeriod = URLEncoder.encode(period != null ? period : "2026 - Ciclo 2 Agosto", StandardCharsets.UTF_8);
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(gatewayBaseUrl + "/schedule/export.ics?period=" + encodedPeriod))
                    .timeout(Duration.ofSeconds(20))
                    .header("Accept", "text/calendar, text/plain, */*")
                    .GET();

            if (token != null && !token.isBlank()) {
                reqBuilder.header("Authorization", token.startsWith("Bearer ") ? token : "Bearer " + token);
            }

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() == 200) {
                return response.body();
            }
        } catch (Exception e) {
            log.error("[UtpPortalGatewayAdapter] Error exportando calendario .ics: {}", e.getMessage());
        }
        return "";
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
