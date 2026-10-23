package com.utp.horario.interfaces.rest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.utp.horario.application.dtos.AcademicToolDto.DayScheduleResult;
import com.utp.horario.application.dtos.AcademicToolDto.EnrolledCoursesResult;
import com.utp.horario.application.service.tool.AcademicToolRegistry;
import com.utp.horario.application.service.tool.AcademicToolDispatcher;
import com.utp.horario.application.service.tool.AcademicToolService;
import com.utp.horario.application.service.StudentSessionService;
import com.utp.horario.infrastructure.security.SecurityIdentityResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Blindaje de resiliencia del servidor MCP frente a una sustentación en vivo.
 *
 * <p>Verifica los invariantes críticos: HTTP 200 con envelope JSON-RPC válido, reflejo exacto
 * del {@code id}, ausencia de NullPointerException ante argumentos ausentes o malformados y
 * degradación limpia cuando el estudiante no tiene sesión UTP activa.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class McpServerControllerResilienceTest {

    @Mock
    private AcademicToolService toolService;

    @Mock
    private SecurityIdentityResolver identityResolver;

    @Mock
    private StudentSessionService studentSessionService;

    private McpServerController controller;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        controller = new McpServerController(toolService, mapper, identityResolver, studentSessionService,
                new AcademicToolDispatcher(toolService, mapper));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Ciclo de vida del protocolo MCP
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("initialize devuelve protocolVersion 2024-11-05, capacidades y serverInfo")
    void initializeReturnsMcpHandshake() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609", rpcRequest("initialize"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) response.getBody().get("result");

        assertEquals("2024-11-05", result.get("protocolVersion"));

        @SuppressWarnings("unchecked")
        Map<String, Object> capabilities = (Map<String, Object>) result.get("capabilities");
        @SuppressWarnings("unchecked")
        Map<String, Object> tools = (Map<String, Object>) capabilities.get("tools");
        assertEquals(Boolean.FALSE, tools.get("listChanged"));

        @SuppressWarnings("unchecked")
        Map<String, Object> serverInfo = (Map<String, Object>) result.get("serverInfo");
        assertEquals("horario-inteligente-mcp", serverInfo.get("name"));
        assertTrue(((String) serverInfo.get("version")).matches("\\d+\\.\\d+\\.\\d+"),
                "La version del servidor debe ser semantica");
    }

    @Test
    @DisplayName("El id de la peticion se refleja exactamente en la respuesta")
    void jsonRpcIdIsEchoedVerbatim() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        // id numerico
        ResponseEntity<Map<String, Object>> numeric = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609", rpcRequestWithId(7L));
        assertEquals("7", ((JsonNode) numeric.getBody().get("id")).asText());
        assertTrue(numeric.getBody().get("id") instanceof JsonNode node && node.isNumber(),
                "Un id numerico debe reflejarse como numero, no como cadena");

        // id textual
        ResponseEntity<Map<String, Object>> textual = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609", rpcRequestWithId("abc-123"));
        assertEquals("abc-123", ((JsonNode) textual.getBody().get("id")).asText());
        assertTrue(textual.getBody().get("id") instanceof JsonNode node && node.isTextual(),
                "Un id textual debe reflejarse como cadena, no como numero");

        // id explicitoamente nulo
        ResponseEntity<Map<String, Object>> nullId = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609", rpcRequestWithId(null));
        assertTrue(nullId.getBody().containsKey("id"));
        assertTrue(((JsonNode) nullId.getBody().get("id")).isNull());
    }

    @Test
    @DisplayName("notifications/initialized y ping se procesan sin error")
    void notificationsAndPingAreHandledCleanly() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        ResponseEntity<Map<String, Object>> notification = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609",
                rpcNotification("notifications/initialized"));
        assertEquals(HttpStatus.OK, notification.getStatusCode());
        assertTrue(notification.getBody() == null || notification.getBody().isEmpty(),
                "Una notificacion no debe producir cuerpo de respuesta");

        ResponseEntity<Map<String, Object>> ping = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609", rpcRequest("ping"));
        assertEquals(HttpStatus.OK, ping.getStatusCode());
        assertNotNull(ping.getBody().get("result"));
    }

    @Test
    @DisplayName("Una notificacion que incluye id recibe un envelope de respuesta valido")
    void notificationWithIdReceivesEnvelope() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("notifications/initialized", 1L, null, null));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("2.0", response.getBody().get("jsonrpc"));
        assertNotNull(response.getBody().get("id"));
    }

    @Test
    @DisplayName("Un cuerpo vacio responde -32700 con HTTP 200 en lugar de propagating 400")
    void emptyBodyReturnsParseError() throws Exception {
        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609", null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> error = (Map<String, Object>) response.getBody().get("error");
        assertEquals(-32700, error.get("code"));
    }

    @Test
    @DisplayName("Un metodo desconocido responde -32601 con HTTP 200")
    void unknownMethodReturnsMethodNotFound() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609", rpcRequest("does/not/exist"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> error = (Map<String, Object>) response.getBody().get("error");
        assertEquals(-32601, error.get("code"));
    }

    @Test
    @DisplayName("tools/list publica inputSchema y omite studentCode en el esquema")
    void toolsListPublishesInputSchema() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609", rpcRequest("tools/list"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> tools =
                (List<Map<String, Object>>) ((Map<String, Object>) response.getBody().get("result")).get("tools");
        assertEquals(4, tools.size());
        for (Map<String, Object> tool : tools) {
            assertNotNull(tool.get("inputSchema"));
            assertFalse(tool.containsKey("studentCode"));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Resolucion de identidad sin token de sesion
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Sin token pero con registro persistido, la identidad se resuelve contra MySQL")
    void degradedIdentityFallsBackToPersistedStudent() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any()))
                .thenThrow(new SecurityException("Acceso no autorizado: Se requiere un token de sesion legitimo de UTP."));
        when(toolService.resolvePersistedStudentCode("U23307609")).thenReturn("U23307609");
        when(toolService.getEnrolledCourses(anyString()))
                .thenReturn(new EnrolledCoursesResult("U23307609", 1,
                        List.of(new com.utp.horario.application.dtos.AcademicToolDto.EnrolledCourseDto(
                                "100000SI58", "SERVICIOS CLOUD")), null));

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", null,
                rpcRequest("tools/call", "get_enrolled_courses", Map.of()));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(toolService).resolvePersistedStudentCode("U23307609");
        verify(toolService).getEnrolledCourses("U23307609");
    }

    @Test
    @DisplayName("Sin token y sin registro persistido, se responde con mensaje limpio (nunca 500)")
    void missingPersistedStudentYieldsCleanError() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any()))
                .thenThrow(new SecurityException("Acceso no autorizado: Se requiere un token de sesion legitimo de UTP."));
        when(toolService.resolvePersistedStudentCode(anyString())).thenReturn(null);

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U99999999", null,
                rpcRequest("tools/call", "get_today_schedule", Map.of()));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().containsKey("error"), "Debe informarse el rechazo de identidad");
        verify(toolService, never()).getTodaySchedule(anyString(), anyString());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Ejecucion determinista de las 4 herramientas
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("get_today_schedule con fecha invalida responde isError=true sin invocar el servicio")
    void invalidDateIsRejectedWithoutCallingService() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_today_schedule", Map.of("date", "ayer")));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) response.getBody().get("result");
        assertEquals(Boolean.TRUE, result.get("isError"));
        verify(toolService, never()).getTodaySchedule(anyString(), anyString());
    }

    @Test
    @DisplayName("get_today_schedule sin fecha usa la fecha actual en America/Lima")
    void missingDateFallsBackToToday() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");
        when(toolService.getTodaySchedule(anyString(), anyString()))
                .thenReturn(new DayScheduleResult("U23307609", "2026-10-21", 0, List.of(), "Sin clases"));

        controller.handleJsonRpcMessage(null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_today_schedule", Map.of()));

        verify(toolService).getTodaySchedule(eq("U23307609"),
                eq(java.time.LocalDate.now(java.time.ZoneId.of("America/Lima")).toString()));
    }

    @Test
    @DisplayName("get_syllabus_details exige course_query y propaga el studentCode del servidor")
    void syllabusRequiresCourseQuery() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_syllabus_details", Map.of()));

        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) response.getBody().get("result");
        assertEquals(Boolean.TRUE, result.get("isError"));
        verify(toolService, never()).getSyllabusDetails(anyString(), anyString());
    }

    @Test
    @DisplayName("get_upcoming_evaluations acepta current_week numérico y textual")
    void currentWeekAcceptsNumberAndString() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");
        when(toolService.getUpcomingEvaluations(anyString(), anyInt())).thenReturn(List.of());

        controller.handleJsonRpcMessage(null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_upcoming_evaluations", Map.of("current_week", 9)));
        verify(toolService).getUpcomingEvaluations("U23307609", 9);

        controller.handleJsonRpcMessage(null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_upcoming_evaluations", Map.of("current_week", "11")));
        verify(toolService).getUpcomingEvaluations("U23307609", 11);
    }

    @Test
    @DisplayName("get_upcoming_evaluations ante valor no interpretable resuelve la semana dinámicamente")
    void nonNumericWeekResolvesDynamically() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");
        when(toolService.resolveCurrentWeek(anyString())).thenReturn(4);
        when(toolService.getUpcomingEvaluations(anyString(), anyInt())).thenReturn(List.of());

        controller.handleJsonRpcMessage(null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_upcoming_evaluations", Map.of("current_week", "semana seis")));

        verify(toolService).getUpcomingEvaluations("U23307609", 4);
    }

    @Test
    @DisplayName("get_upcoming_evaluations degrada a la semana por defecto sin snapshot dinámico")
    void nonNumericWeekDegradesToDefault() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");
        when(toolService.resolveCurrentWeek(anyString())).thenReturn(null);
        when(toolService.getUpcomingEvaluations(anyString(), anyInt())).thenReturn(List.of());

        controller.handleJsonRpcMessage(null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_upcoming_evaluations", Map.of("current_week", "semana seis")));

        verify(toolService).getUpcomingEvaluations("U23307609", 6);
    }

    @Test
    @DisplayName("get_upcoming_evaluations acota la semana al rango lectivo 1-18")
    void weekIsClampedToAcademicRange() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");
        when(toolService.getUpcomingEvaluations(anyString(), anyInt())).thenReturn(List.of());

        controller.handleJsonRpcMessage(null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_upcoming_evaluations", Map.of("current_week", 99)));
        verify(toolService).getUpcomingEvaluations("U23307609", 18);

        controller.handleJsonRpcMessage(null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_upcoming_evaluations", Map.of("current_week", 0)));
        verify(toolService).getUpcomingEvaluations("U23307609", 1);
    }

    @Test
    @DisplayName("Un payload vacio se marca isError=true y explica el motivo")
    void emptyPayloadIsFlaggedWithExplanation() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");
        when(toolService.getEnrolledCourses(anyString()))
                .thenReturn(new EnrolledCoursesResult("U23307609", 0, List.of(), null));

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_enrolled_courses", Map.of()));

        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) response.getBody().get("result");
        assertEquals(Boolean.TRUE, result.get("isError"));

        @SuppressWarnings("unchecked")
        String text = ((List<Map<String, Object>>) result.get("content")).get(0).get("text").toString();
        assertTrue(text.contains("message"), "El payload vacio debe incluir un mensaje explicativo");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Manejo defensivo de errores
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Una herramienta inexistente responde isError=true con la lista de soportadas")
    void unsupportedToolListsSupportedTools() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "simulate_target_grade", Map.of()));

        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) response.getBody().get("result");
        assertEquals(Boolean.TRUE, result.get("isError"));

        @SuppressWarnings("unchecked")
        String text = ((List<Map<String, Object>>) result.get("content")).get(0).get("text").toString();
        assertTrue(text.contains("simulate_target_grade"));
        for (String supported : AcademicToolRegistry.getSupportedToolNames()) {
            assertTrue(text.contains(supported), "Debe listar la herramienta soportada " + supported);
        }
    }

    @Test
    @DisplayName("Una excepcion interna del servicio degrada a isError=true con HTTP 200")
    void serviceFailureDegradesToToolError() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");
        when(toolService.getTodaySchedule(anyString(), anyString()))
                .thenThrow(new IllegalStateException("Fallo transitorio de la pasarela externa"));

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_today_schedule", Map.of()));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) response.getBody().get("result");
        assertEquals(Boolean.TRUE, result.get("isError"));
        assertNotNull(result.get("content"));
    }

    @Test
    @DisplayName("El cliente MCP no puede inyectar su propio studentCode en la sesion degradada")
    void clientCannotOverrideIdentityInDegradedMode() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any()))
                .thenThrow(new SecurityException("Acceso no autorizado: Se requiere un token de sesion legitimo de UTP."));
        when(toolService.resolvePersistedStudentCode("U23307609")).thenReturn("U23307609");
        when(toolService.getEnrolledCourses(anyString()))
                .thenReturn(new EnrolledCoursesResult("U23307609", 0, List.of(), "sin datos"));

        controller.handleJsonRpcMessage(null, null, null, "U23307609", null,
                rpcRequest("tools/call", "get_enrolled_courses", Map.of("studentCode", "U99999999")));

        verify(toolService).getEnrolledCourses("U23307609");
        verify(toolService, never()).getEnrolledCourses("U99999999");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Utilidades de construccion de payloads
    // ─────────────────────────────────────────────────────────────────────────

    private ObjectNode rpcRequest(String method) throws Exception {
        return rpcRequest(method, 1L, null, null);
    }

    /** Notificacion JSON-RPC: no incluye la clave "id". */
    private ObjectNode rpcNotification(String method) throws Exception {
        return rpcRequest(method, null, null, null);
    }

    /** Peticion con id explicito (numerico, textual o nulo). */
    private ObjectNode rpcRequestWithId(Object id) throws Exception {
        ObjectNode root = mapper.createObjectNode();
        root.put("jsonrpc", "2.0");
        if (id instanceof Number number) {
            root.put("id", number.longValue());
        } else if (id != null) {
            root.put("id", id.toString());
        } else {
            root.putNull("id");
        }
        root.put("method", "initialize");
        return root;
    }

    private ObjectNode rpcRequest(String method, String toolName, Map<String, Object> arguments) throws Exception {
        return rpcRequest(method, 1L, toolName, arguments);
    }

    private ObjectNode rpcRequest(String method, Object id, String toolName,
                                   Map<String, Object> arguments) throws Exception {
        ObjectNode root = mapper.createObjectNode();
        root.put("jsonrpc", "2.0");
        if (id instanceof Number number) {
            root.put("id", number.longValue());
        } else if (id != null) {
            root.put("id", id.toString());
        }
        root.put("method", method);
        if (toolName != null) {
            ObjectNode params = root.putObject("params");
            params.put("name", toolName);
            params.set("arguments", mapper.valueToTree(arguments == null ? Map.of() : arguments));
        }
        return root;
    }
}
