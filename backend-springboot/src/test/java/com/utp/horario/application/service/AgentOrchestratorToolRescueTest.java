package com.utp.horario.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.service.tool.AcademicToolService;
import com.utp.horario.infraestructure.external.OpenRouterModelSelector;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Respaldo de invocacion de herramienta emitida como texto.
 *
 * <p>Cuando el proveedor no materializa la estructura nativa {@code tool_calls}, el modelo
 * escribe la invocacion como un bloque JSON dentro del contenido. El orquestador debe
 * recuperarla y continuar el ciclo ReAct en lugar de devolver la narracion del modelo.</p>
 */
@ExtendWith(MockitoExtension.class)
class AgentOrchestratorToolRescueTest {

    @Mock
    private AcademicToolService toolService;

    @Mock
    private DailyQuotaService quotaService;

    @Mock
    private OpenRouterModelSelector modelSelector;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private AgentOrchestratorServiceImpl orchestrator;

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("Recupera la invocacion de un bloque de codigo json con parametros")
    void rescuesToolCallFromFencedJsonBlock() throws Exception {
        String content = """
                ### Consulta de Temas
                Primero confirmo la clase y luego procedo a consultar el sílabo.

                ```json
                {
                  "name": "get_syllabus_details",
                  "parameters": { "course_query": "Desarrollo web integrado", "week": 11 }
                }
                ```
                """;

        JsonNode rescued = orchestrator.rescueToolCalls(content);

        assertNotNull(rescued, "La invocacion emitida como texto debe recuperarse");
        assertEquals(1, rescued.size());
        assertEquals("get_syllabus_details", rescued.get(0).at("/function/name").asText());
        // El formato OpenAI transporta 'arguments' como cadena JSON
        JsonNode args = mapper.readTree(rescued.get(0).at("/function/arguments").asText());
        assertEquals(11, args.path("week").asInt());
        assertEquals("Desarrollo web integrado", args.path("course_query").asText());
    }

    @Test
    @DisplayName("Recupera la invocacion de un objeto JSON sin bloque cercado")
    void rescuesToolCallFromRawJson() {
        String content = "Listo: {\"name\": \"get_today_schedule\", \"parameters\": {\"date\": \"2026-10-22\"}}";

        JsonNode rescued = orchestrator.rescueToolCalls(content);

        assertNotNull(rescued);
        assertEquals("get_today_schedule", rescued.get(0).at("/function/name").asText());
    }

    @Test
    @DisplayName("Acepta el alias 'arguments' en lugar de 'parameters'")
    void rescuesToolCallUsingArgumentsAlias() {
        String content = "{\"name\": \"get_enrolled_courses\", \"arguments\": {}}";

        JsonNode rescued = orchestrator.rescueToolCalls(content);

        assertNotNull(rescued);
        assertEquals("get_enrolled_courses", rescued.get(0).at("/function/name").asText());
        assertTrue(rescued.get(0).at("/function/arguments").asText().contains("{"));
    }

    @Test
    @DisplayName("Ignora un JSON que no corresponda a una herramienta soportada")
    void ignoresJsonForUnknownTool() {
        String content = "{\"name\": \"drop_all_students\", \"parameters\": {}}";

        assertNull(orchestrator.rescueToolCalls(content),
                "No debe ejecutarse una herramienta fuera del registro publicado");
    }

    @Test
    @DisplayName("No hay invocacion que recuperar en una respuesta de prosa")
    void returnsNullForPlainProse() {
        assertNull(orchestrator.rescueToolCalls("Primero debemos confirmar la clase de hoy."));
        assertNull(orchestrator.rescueToolCalls(""));
        assertNull(orchestrator.rescueToolCalls(null));
    }
}
