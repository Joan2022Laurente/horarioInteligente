package com.utp.horario.interfaces.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.dtos.AcademicToolDto.DayScheduleResult;
import com.utp.horario.application.service.StudentSessionService;
import com.utp.horario.application.service.tool.AcademicToolDispatcher;
import com.utp.horario.application.service.tool.AcademicToolRegistry;
import com.utp.horario.application.service.tool.AcademicToolService;
import com.utp.horario.infrastructure.security.SecurityIdentityResolver;
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

    /** JWT de prueba: 3 segmentos, payload Base64Url con preferred_username y exp numérico. */
    private static final String BEARER =
            "Bearer eyJhbGciOiJIUzI1NiJ9.eyJwcmVmZXJyZWRfdXNlcm5hbWUiOiJVMjMzMDc2MDkiLCJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl";

    @Mock
    private AcademicToolService toolService;

    @Mock
    private SecurityIdentityResolver identityResolver;

    private MockMvc mockMvc;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        McpServerController controller =
                new McpServerController(toolService, mapper, identityResolver,
                        new AcademicToolDispatcher(toolService, mapper));
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /mcp/message responde 200 con envelope JSON-RPC valido")
    void postMessageReturnsJsonRpcEnvelope() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        mockMvc.perform(post("/mcp/message")
                        .header("Authorization", BEARER)
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
                        .header("Authorization", BEARER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"jsonrpc":"2.0","id":"t-1","method":"tools/list"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("t-1"))
                .andExpect(jsonPath("$.result.tools.length()").value(AcademicToolRegistry.getSupportedToolNames().size()))
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
                        .header("Authorization", BEARER)
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
                        .header("Authorization", BEARER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"jsonrpc":"2.0","id":1,"method":"tools/call",
                                 "params":{"name":"get_today_schedule","arguments":{"date":"31/12/2026"}}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.isError").value(true));
    }

    @Test
    @DisplayName("Un cuerpo vacio responde 200 con error -32700 e id null")
    void emptyBodyReturnsParseError() throws Exception {
        mockMvc.perform(post("/mcp/message")
                        .header("Authorization", BEARER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.error.code").value(-32700));
    }

    @Test
    @DisplayName("Una peticion sin JSON valido responde 200 con error -32700 e id null")
    void malformedJsonReturnsParseError() throws Exception {
        mockMvc.perform(post("/mcp/message")
                        .header("Authorization", BEARER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{no-es-json"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.error.code").value(-32700));
    }

    @Test
    @DisplayName("Petición con jsonrpc distinto a 2.0 responde con error -32600")
    void invalidJsonRpcVersionReturnsInvalidRequest() throws Exception {
        mockMvc.perform(post("/mcp/message")
                        .header("Authorization", BEARER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"jsonrpc":"1.0","id":1,"method":"ping"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.error.code").value(-32600));
    }

    @Test
    @DisplayName("Peticiones batch (array) son rechazadas con código -32600")
    void batchRequestsAreRejected() throws Exception {
        mockMvc.perform(post("/mcp/message")
                        .header("Authorization", BEARER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                [{"jsonrpc":"2.0","id":1,"method":"ping"}]
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.error.code").value(-32600));
    }

    @Test
    @DisplayName("Content-Type no soportado responde 200 con error JSON-RPC -32600")
    void unsupportedMediaTypeReturnsJsonRpcError() throws Exception {
        mockMvc.perform(post("/mcp/message")
                        .header("Authorization", BEARER)
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("hello"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.error.code").value(-32600));
    }

    @Test
    @DisplayName("GET /mcp/info expone el contrato del servidor sin autenticacion")
    void infoEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/mcp/info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("horario-inteligente-mcp"))
                .andExpect(jsonPath("$.protocolVersion").value("2024-11-05"))
                .andExpect(jsonPath("$.tools.length()").value(AcademicToolRegistry.getSupportedToolNames().size()));
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
                        .header("Authorization", BEARER)
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
    @DisplayName("Sin Bearer, la respuesta es 200 con error JSON-RPC -32000 (sin fallback a registro)")
    void missingIdentityYieldsCleanJsonRpcError() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any()))
                .thenThrow(new SecurityException("Acceso no autorizado: Se requiere un token de sesion legitimo de UTP."));

        mockMvc.perform(post("/mcp/message")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"jsonrpc":"2.0","id":1,"method":"tools/call",
                                 "params":{"name":"get_enrolled_courses","arguments":{}}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error.code").value(-32000))
                .andExpect(jsonPath("$.error.message")
                        .value(org.hamcrest.Matchers.containsString("Authorization: Bearer")));
    }

    @Test
    @DisplayName("El mapeo de herramientas de la capa de aplicacion es identico al publicado por MCP")
    void toolCatalogueMatchesApplicationLayer() throws Exception {
        when(identityResolver.resolveStudentCode(any(), any())).thenReturn("U23307609");

        String body = mockMvc.perform(post("/mcp/message")
                        .header("Authorization", BEARER)
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
