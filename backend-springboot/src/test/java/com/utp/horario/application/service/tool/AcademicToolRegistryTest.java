package com.utp.horario.application.service.tool;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Contrato publico de las herramientas academicas expuestas al LLM (Function Calling) y al servidor MCP.
 *
 * <p>Estas pruebas blindan el contrato que documenta INFORME_TECNICO_PROYECTO.md (Anexo B) para que
 * cualquier cambio en {@link AcademicToolRegistry} rompa la compilacion de las pruebas en lugar de
 * desincronizar silenciosamente el informe, el orquestador y el servidor MCP.
 */
class AcademicToolRegistryTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** Las unicas 4 herramientas realmente soportadas por el backend. */
    private static final List<String> EXPECTED_TOOLS = List.of(
            "get_today_schedule",
            "get_enrolled_courses",
            "get_syllabus_details",
            "get_upcoming_evaluations"
    );

    @Test
    @DisplayName("El registro expone exactamente las 4 herramientas academicas soportadas")
    void registryExposesExactlyTheFourSupportedTools() {
        assertEquals(EXPECTED_TOOLS, AcademicToolRegistry.getSupportedToolNames());
    }

    @Test
    @DisplayName("Ninguna herramienta publica studentCode como parametro: se inyecta server-side")
    void noToolDeclaresStudentCodeAsParameter() {
        for (Map<String, Object> definition : AcademicToolRegistry.getOpenAiToolDefinitions()) {
            @SuppressWarnings("unchecked")
            Map<String, Object> function = (Map<String, Object>) definition.get("function");
            @SuppressWarnings("unchecked")
            Map<String, Object> parameters = (Map<String, Object>) function.get("parameters");

            @SuppressWarnings("unchecked")
            Map<String, Object> properties = (Map<String, Object>) parameters.get("properties");
            assertNotNull(properties, "Toda herramienta debe declarar 'properties'");
            assertFalse(properties.containsKey("studentCode"),
                    "La herramienta " + function.get("name") + " no debe declarar 'studentCode'");
            assertFalse(properties.containsKey("student_code"),
                    "La herramienta " + function.get("name") + " no debe declarar 'student_code'");
        }
    }

    @Test
    @DisplayName("get_syllabus_details declara course_query como parametro requerido")
    void syllabusDetailsDeclaresCourseQueryAsRequired() {
        Map<String, Object> function = functionByName("get_syllabus_details");
        @SuppressWarnings("unchecked")
        Map<String, Object> parameters = (Map<String, Object>) function.get("parameters");
        @SuppressWarnings("unchecked")
        Map<String, Object> properties = (Map<String, Object>) parameters.get("properties");

        assertTrue(properties.containsKey("course_query"),
                "get_syllabus_details debe declarar 'course_query'");
        assertEquals(List.of("course_query"), parameters.get("required"),
                "El unico parametro requerido debe ser 'course_query'");
    }

    @Test
    @DisplayName("El alias course_code no se declara en el JSON Schema publico")
    void courseCodeAliasIsNotPartOfPublicSchema() {
        Map<String, Object> function = functionByName("get_syllabus_details");
        @SuppressWarnings("unchecked")
        Map<String, Object> parameters = (Map<String, Object>) function.get("parameters");
        @SuppressWarnings("unchecked")
        Map<String, Object> properties = (Map<String, Object>) parameters.get("properties");

        assertFalse(properties.containsKey("course_code"),
                "'course_code' es un alias de compatibilidad y no debe anunciarse al LLM");
    }


    @Test
    @DisplayName("get_today_schedule declara 'date' opcional")
    void todayScheduleDeclaresOptionalDate() {
        Map<String, Object> function = functionByName("get_today_schedule");
        @SuppressWarnings("unchecked")
        Map<String, Object> parameters = (Map<String, Object>) function.get("parameters");
        @SuppressWarnings("unchecked")
        Map<String, Object> properties = (Map<String, Object>) parameters.get("properties");

        assertTrue(properties.containsKey("date"));
        assertFalse(parameters.containsKey("required"), "'date' es opcional en get_today_schedule");
    }

    @Test
    @DisplayName("get_upcoming_evaluations declara 'current_week' requerido")
    void upcomingEvaluationsDeclaresRequiredCurrentWeek() {
        Map<String, Object> function = functionByName("get_upcoming_evaluations");
        @SuppressWarnings("unchecked")
        Map<String, Object> parameters = (Map<String, Object>) function.get("parameters");

        assertEquals(List.of("current_week"), parameters.get("required"));
    }

    @Test
    @DisplayName("get_enrolled_courses no declara parametros de entrada")
    void enrolledCoursesDeclaresNoParameters() {
        Map<String, Object> function = functionByName("get_enrolled_courses");
        @SuppressWarnings("unchecked")
        Map<String, Object> parameters = (Map<String, Object>) function.get("parameters");
        @SuppressWarnings("unchecked")
        Map<String, Object> properties = (Map<String, Object>) parameters.get("properties");

        assertTrue(properties.isEmpty(), "get_enrolled_courses no admite parametros");
    }


    @Test
    @DisplayName("resolveCourseQuery prioriza course_query sobre el alias course_code")
    void resolveCourseQueryPrefersCanonicalKey() throws Exception {
        JsonNode args = MAPPER.readTree("{\"course_query\":\"servicios cloud\",\"course_code\":\"100000SI68\"}");
        assertEquals("servicios cloud", AcademicToolRegistry.resolveCourseQuery(args));
    }

    @Test
    @DisplayName("resolveCourseQuery acepta el alias course_code para clientes MCP antiguos")
    void resolveCourseQueryFallsBackToAlias() throws Exception {
        JsonNode args = MAPPER.readTree("{\"course_code\":\"100000SI68\"}");
        assertEquals("100000SI68", AcademicToolRegistry.resolveCourseQuery(args));
    }

    @Test
    @DisplayName("resolveCourseQuery devuelve cadena vacia si no hay parametros de curso")
    void resolveCourseQueryReturnsEmptyWhenMissing() throws Exception {
        assertEquals("", AcademicToolRegistry.resolveCourseQuery(MAPPER.readTree("{}")));
        assertEquals("", AcademicToolRegistry.resolveCourseQuery(null));
    }

    @ParameterizedTest(name = "Definicion valida de herramienta academica")
    @MethodSource("allToolDefinitions")
    @DisplayName("Cada definicion de herramienta tiene type, name, description y parameters")
    void everyToolDefinitionIsWellFormed(Map<String, Object> definition) {
        assertEquals("function", definition.get("type"));
        @SuppressWarnings("unchecked")
        Map<String, Object> function = (Map<String, Object>) definition.get("function");
        assertNotNull(function.get("name"));
        assertNotNull(function.get("description"));
        assertNotNull(function.get("parameters"));
    }

    static Stream<Map<String, Object>> allToolDefinitions() {
        return AcademicToolRegistry.getOpenAiToolDefinitions().stream();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> functionByName(String name) {
        return AcademicToolRegistry.getOpenAiToolDefinitions().stream()
                .map(def -> (Map<String, Object>) def.get("function"))
                .filter(fn -> name.equals(fn.get("name")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("La herramienta '" + name + "' no esta registrada"));
    }
}
