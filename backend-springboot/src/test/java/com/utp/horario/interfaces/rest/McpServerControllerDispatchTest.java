package com.utp.horario.interfaces.rest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.dtos.AcademicToolDto.EnrolledCoursesResult;
import com.utp.horario.application.dtos.AcademicToolDto.SyllabusDetailsResult;
import com.utp.horario.application.service.tool.AcademicToolRegistry;
import com.utp.horario.application.service.StudentSessionService;
import com.utp.horario.application.service.tool.AcademicToolService;
import com.utp.horario.infraestructure.security.SecurityIdentityResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Contrato del servidor MCP (JSON-RPC 2.0) y su paridad con el orquestador de IA.
 *
 * <p>El servidor MCP y el agente orquestador deben despachar las mismas herramientas con los mismos
 * argumentos. Esta clase blinda la paridad (defecto D1) y el marcado de errores (defecto D6).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class McpServerControllerDispatchTest {

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
        controller = new McpServerController(toolService, mapper, identityResolver, studentSessionService);
    }

    @Test
    @DisplayName("tools/list publica el mismo contrato que el registro de herramientas")
    void toolsListMatchesAcademicToolRegistry() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609", rpcRequest("tools/list"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> tools =
                (List<Map<String, Object>>) ((Map<String, Object>) response.getBody().get("result")).get("tools");

        assertEquals(AcademicToolRegistry.getSupportedToolNames(),
                tools.stream().map(t -> (String) t.get("name")).toList());
        for (Map<String, Object> tool : tools) {
            assertTrue(tool.containsKey("inputSchema"), "Cada herramienta MCP debe publicar 'inputSchema'");
            assertFalse(tool.containsKey("studentCode"), "El esquema MCP no debe exponer 'studentCode'");
        }
    }

    @Test
    @DisplayName("get_syllabus_details inyecta el studentCode del servidor, no el del LLM")
    void syllabusDetailsInjectsServerSideStudentCode() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");
        when(toolService.getSyllabusDetails(anyString(), anyString()))
                .thenReturn(syllabus("100000SI68", "SERVICIOS CLOUD"));

        controller.handleJsonRpcMessage(null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_syllabus_details", Map.of("course_query", "servicios cloud")));

        verify(toolService).getSyllabusDetails(eq("U23307609"), eq("servicios cloud"));
    }

    @Test
    @DisplayName("get_syllabus_details acepta el alias course_code para clientes MCP antiguos")
    void syllabusDetailsAcceptsCourseCodeAlias() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");
        when(toolService.getSyllabusDetails(anyString(), anyString()))
                .thenReturn(syllabus("100000SI68", "SERVICIOS CLOUD"));

        controller.handleJsonRpcMessage(null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_syllabus_details", Map.of("course_code", "100000SI68")));

        verify(toolService).getSyllabusDetails(eq("U23307609"), eq("100000SI68"));
    }

    @Test
    @DisplayName("Una herramienta desconocida se responde con isError=true y lista de soportadas")
    void unknownToolIsFlaggedAsError() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "simulate_target_grade", Map.of()));

        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) response.getBody().get("result");
        assertEquals(Boolean.TRUE, result.get("isError"),
                "Una herramienta no soportada debe marcarse como error, no como resultado exitoso");

        @SuppressWarnings("unchecked")
        String text = ((List<Map<String, Object>>) result.get("content")).get(0).get("text").toString();
        assertTrue(text.contains("simulate_target_grade"));
        assertTrue(text.contains("get_today_schedule"), "Debe listar las herramientas realmente soportadas");
    }

    @Test
    @DisplayName("get_enrolled_courses propaga el studentCode resuelto al servicio")
    void enrolledCoursesPropagatesStudentCode() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");
        when(toolService.getEnrolledCourses(anyString()))
                .thenReturn(new EnrolledCoursesResult("U23307609", 0, List.of(), null));

        controller.handleJsonRpcMessage(null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_enrolled_courses", Map.of()));

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(toolService).getEnrolledCourses(captor.capture());
        assertEquals("U23307609", captor.getValue());
    }

    @Test
    @DisplayName("Sin credenciales validas responde error JSON-RPC -32000 con HTTP 200")
    void unauthenticatedRequestIsRejected() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any()))
                .thenThrow(new SecurityException("Acceso no autorizado: Se requiere un token de sesion legitimo de UTP."));

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, null, null, rpcRequest("tools/list"));

        // El canal JSON-RPC siempre responde 200 OK con envelope valido: el cliente MCP nunca
        // debe interpretar un rechazo de autenticacion como un fallo de transporte (HTTP 5xx).
        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> error = (Map<String, Object>) response.getBody().get("error");
        assertEquals(-32000, error.get("code"));
        assertTrue(((String) error.get("message")).contains("token"),
                "El mensaje de rechazo debe indicar como autenticarse");
        verify(toolService, never()).getEnrolledCourses(anyString());
    }

    @Test
    @DisplayName("Un metodo JSON-RPC desconocido responde con error -32601")
    void unknownMethodReturnsJsonRpcError() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        ResponseEntity<Map<String, Object>> response = controller.handleJsonRpcMessage(
                null, null, null, "U23307609", "Bearer U23307609", rpcRequest("does/not/exist"));

        @SuppressWarnings("unchecked")
        Map<String, Object> error = (Map<String, Object>) response.getBody().get("error");
        assertEquals(-32601, error.get("code"));
    }

    @Test
    @DisplayName("El cliente MCP nunca puede inyectar su propio studentCode en la herramienta")
    void clientCannotOverrideStudentCode() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");
        when(toolService.getEnrolledCourses(anyString()))
                .thenReturn(new EnrolledCoursesResult("U23307609", 0, List.of(), null));

        controller.handleJsonRpcMessage(null, null, null, "U23307609", "Bearer U23307609",
                rpcRequest("tools/call", "get_enrolled_courses", Map.of("studentCode", "U99999999")));

        verify(toolService).getEnrolledCourses(eq("U23307609"));
        verify(toolService, never()).getEnrolledCourses(eq("U99999999"));
    }

    private static SyllabusDetailsResult syllabus(String code, String name) {
        return new SyllabusDetailsResult(code, name, 3, "F", "G", List.of(), List.of(), null);
    }

    private JsonNode rpcRequest(String method) throws Exception {
        return rpcRequest(method, null, null);
    }

    private JsonNode rpcRequest(String method, String toolName, Map<String, Object> arguments) throws Exception {
        var root = mapper.createObjectNode();
        root.put("jsonrpc", "2.0");
        root.put("id", 1);
        root.put("method", method);
        if (toolName != null) {
            var params = root.putObject("params");
            params.put("name", toolName);
            params.set("arguments", mapper.valueToTree(arguments == null ? Map.of() : arguments));
        }
        return root;
    }
}