package com.utp.horario.interfaces.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.dtos.AcademicToolDto.DayScheduleResult;
import com.utp.horario.application.dtos.AcademicToolDto.EnrolledCoursesResult;
import com.utp.horario.application.service.tool.AcademicToolService;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.infraestructure.security.SecurityIdentityResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verificacion a nivel de transporte HTTP del servidor MCP.
 *
 * <p>Reproduce exactamente lo que observa un cliente MCP real (Claude Desktop, MCP Inspector):
 * ruta, tipo de contenido, codigo de estado y forma del envelope JSON-RPC. Ningun escenario
 * de uso puede derivar en un codigo 5xx.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class McpServerControllerHttpTest {

    @Mock
    private AcademicToolService toolService;

    @Mock
    private SecurityIdentityResolver identityResolver;

    @Mock
    private IUtpPortalGateway utpPortalGateway;

    private MockMvc mockMvc;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        McpServerController controller =
                new McpServerController(toolService, mapper, identityResolver, utpPortalGateway);
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /mcp/message responde 200 con envelope JSON-RPC valido")
    void postMessageReturnsJsonRpcEnvelope() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        mockMvc.perform(post("/mcp/message")
                        .param("studentCode", "U23307609")
                        .header("Authorization", "Bearer U23307609")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"jsonrpc":"2.0","id":1,"method":"initialize"}
                                """))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.jsonrpc").value("2.0"))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.result.protocolVersion").value("2024-11-05"))
                .andExpect(jsonPath("$.result.serverInfo.name").value("horario-inteligente-mcp"))
                .andExpect(jsonPath("$.result.capabilities.tools.listChanged").value(false));
    }

    @Test
    @DisplayName("POST /api/v1/mcp/message publica el catalogo de herramientas")
    void postMessageUnderApiPrefixListsTools() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        mockMvc.perform(post("/api/v1/mcp/message")
                        .param("studentCode", "U23307609")
                        .header("Authorization", "Bearer U23307609")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"jsonrpc":"2.0","id":"t-1","method":"tools/list"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("t-1"))
                .andExpect(jsonPath("$.result.tools.length()").value(4))
                .andExpect(jsonPath("$.result.tools[0].name").value("get_today_schedule"))
                .andExpect(jsonPath("$.result.tools[0].inputSchema").exists());
    }

    @Test
    @DisplayName("POST /mcp/message ejecuta una herramienta y devuelve el contenido textual")
    void postMessageExecutesTool() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");
        when(toolService.getTodaySchedule(anyString(), anyString()))
                .thenReturn(new DayScheduleResult("U23307609", "2026-10-21", 1,
                        List.of(new com.utp.horario.application.dtos.AcademicToolDto.ClassSessionDto(
                                "100000SI58", "SERVICIOS CLOUD", "18:30", "20:00",
                                "A", "A0402", "Docente UTP")), null));

        mockMvc.perform(post("/mcp/message")
                        .param("studentCode", "U23307609")
                        .header("Authorization", "Bearer U23307609")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"jsonrpc":"2.0","id":1,"method":"tools/call",
                                 "params":{"name":"get_today_schedule","arguments":{"date":"2026-10-21"}}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.isError").value(false))
                .andExpect(jsonPath("$.result.content[0].type").value("text"))
                .andExpect(jsonPath("$.result.content[0].text").value(org.hamcrest.Matchers.containsString("A0402")));
    }

    @Test
    @DisplayName("Una fecha invalida responde 200 con isError=true (nunca 5xx)")
    void invalidDateNeverPropagatesServerError() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        mockMvc.perform(post("/mcp/message")
                        .param("studentCode", "U23307609")
                        .header("Authorization", "Bearer U23307609")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"jsonrpc":"2.0","id":1,"method":"tools/call",
                                 "params":{"name":"get_today_schedule","arguments":{"date":"31/12/2026"}}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.isError").value(true));
    }

    @Test
    @DisplayName("Un cuerpo vacio responde 200 con error -32700")
    void emptyBodyReturnsParseError() throws Exception {
        mockMvc.perform(post("/mcp/message")
                        .param("studentCode", "U23307609")
                        .header("Authorization", "Bearer U23307609")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error.code").value(-32700));
    }

    @Test
    @DisplayName("Una peticion sin JSON valido responde 200 con error -32700")
    void malformedJsonReturnsParseError() throws Exception {
        mockMvc.perform(post("/mcp/message")
                        .param("studentCode", "U23307609")
                        .header("Authorization", "Bearer U23307609")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{no-es-json"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error.code").value(-32700));
    }

    @Test
    @DisplayName("GET /mcp/info expone el contrato del servidor sin autenticacion")
    void infoEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/mcp/info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("horario-inteligente-mcp"))
                .andExpect(jsonPath("$.protocolVersion").value("2024-11-05"))
                .andExpect(jsonPath("$.tools.length()").value(4));
    }

    @Test
    @DisplayName("GET /mcp/sse sin credenciales responde 401 (transporte, no JSON-RPC)")
    void sseHandshakeRejectsUnauthenticatedClients() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any()))
                .thenThrow(new SecurityException("Acceso no autorizado: Se requiere un token de sesion legitimo de UTP."));

        mockMvc.perform(get("/mcp/sse"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Una herramienta inexistente responde 200 con isError=true y lista de soportadas")
    void unknownToolNeverPropagatesServerError() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        mockMvc.perform(post("/mcp/message")
                        .param("studentCode", "U23307609")
                        .header("Authorization", "Bearer U23307609")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"jsonrpc":"2.0","id":1,"method":"tools/call",
                                 "params":{"name":"drop_all_students","arguments":{}}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.isError").value(true))
                .andExpect(jsonPath("$.result.content[0].text")
                        .value(org.hamcrest.Matchers.containsString("get_syllabus_details")));
    }

    @Test
    @DisplayName("Sin token y sin registro persistido, la respuesta es 200 con mensaje limpio")
    void missingIdentityYieldsCleanJsonRpcError() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any()))
                .thenThrow(new SecurityException("Acceso no autorizado: Se requiere un token de sesion legitimo de UTP."));
        when(toolService.resolvePersistedStudentCode(anyString())).thenReturn(null);
        when(toolService.getEnrolledCourses(anyString()))
                .thenReturn(new EnrolledCoursesResult("U99999999", 0, List.of(), "sin datos"));

        mockMvc.perform(post("/mcp/message")
                        .param("studentCode", "U99999999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"jsonrpc":"2.0","id":1,"method":"tools/call",
                                 "params":{"name":"get_enrolled_courses","arguments":{}}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error.code").value(-32000))
                .andExpect(jsonPath("$.error.message")
                        .value(org.hamcrest.Matchers.containsString("token")));
    }

    @Test
    @DisplayName("El mapeo de herramientas de la capa de aplicacion es identico al publicado por MCP")
    void toolCatalogueMatchesApplicationLayer() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        String body = mockMvc.perform(post("/mcp/message")
                        .param("studentCode", "U23307609")
                        .header("Authorization", "Bearer U23307609")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"jsonrpc":"2.0","id":1,"method":"tools/list"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String names = mapper.readTree(body).at("/result/tools").toString();
        for (String tool : com.utp.horario.application.service.tool.AcademicToolRegistry.getSupportedToolNames()) {
            org.junit.jupiter.api.Assertions.assertTrue(names.contains(tool),
                    "El catalogo MCP debe incluir la herramienta " + tool);
        }
    }
}
