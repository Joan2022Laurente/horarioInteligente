package com.utp.horario.application.service.tool;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;

public class AcademicToolRegistry {

    /**
     * Clave canónica del parámetro de búsqueda de curso, tal y como se declara en el
     * JSON Schema de {@code get_syllabus_details}.
     */
    public static final String COURSE_QUERY_PARAM = "course_query";

    /**
     * Alias histórico aceptado por compatibilidad con clientes MCP antiguos.
     * No forma parte del JSON Schema público: el LLM solo debe emitir {@code course_query}.
     */
    public static final String COURSE_CODE_ALIAS_PARAM = "course_code";

    /**
     * Resuelve la consulta de curso desde los argumentos de una invocación de herramienta.
     * Centraliza la lectura de {@code course_query} y su alias {@code course_code} para que
     * el orquestador y el servidor MCP no diverjan en el contrato.
     *
     * @param args argumentos de la herramienta (puede ser {@code null})
     * @return la consulta de curso, o cadena vacia si no se proporciono ningun valor
     */
    public static String resolveCourseQuery(JsonNode args) {
        if (args == null) {
            return "";
        }
        if (args.hasNonNull(COURSE_QUERY_PARAM)) {
            return args.path(COURSE_QUERY_PARAM).asText();
        }
        if (args.hasNonNull(COURSE_CODE_ALIAS_PARAM)) {
            return args.path(COURSE_CODE_ALIAS_PARAM).asText();
        }
        return "";
    }

    /**
     * @return los nombres de las herramientas soportadas por el servidor MCP.
     */
    public static List<String> getSupportedToolNames() {
        return getOpenAiToolDefinitions().stream()
                .map(def -> String.valueOf(((Map<?, ?>) def.get("function")).get("name")))
                .toList();
    }

    /**
     * Verifica si una herramienta forma parte del contrato publicado por el servidor MCP.
     *
     * @param toolName nombre de la herramienta solicitada
     * @return {@code true} si la herramienta existe en el registro
     */
    public static boolean isSupportedTool(String toolName) {
        if (toolName == null || toolName.isBlank()) {
            return false;
        }
        return getSupportedToolNames().contains(toolName.trim());
    }

    public static List<Map<String, Object>> getOpenAiToolDefinitions() {
        return List.of(
                Map.of(
                        "type", "function",
                        "function", Map.of(
                                "name", "get_today_schedule",
                                "description", "Obtiene las clases programadas del estudiante para una fecha determinada (pabellón, aula, horario y docente).",
                                "parameters", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "date", Map.of("type", "string", "description", "Fecha en formato ISO YYYY-MM-DD. Opcional, por defecto hoy.")
                                        )
                                )
                        )
                ),
                Map.of(
                        "type", "function",
                        "function", Map.of(
                                "name", "get_enrolled_courses",
                                "description", "Lista todos los cursos matriculados del estudiante con su código oficial y nombre completo.",
                                "parameters", Map.of(
                                        "type", "object",
                                        "properties", Map.of()
                                )
                        )
                ),
                Map.of(
                        "type", "function",
                        "function", Map.of(
                                "name", "get_syllabus_details",
                                "description", "Obtiene el sílabo oficial (evaluaciones, fórmula, temas). Acepta el código oficial (ej. 100000ST61) O el nombre del curso en lenguaje natural (ej. 'desarrollo web', 'cloud', 'gestión ti').",
                                "parameters", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "course_query", Map.of("type", "string", "description", "Nombre del curso o código exacto. NO inventes abreviaturas de 2 letras.")
                                        ),
                                        "required", List.of("course_query")
                                )
                        )
                ),
                Map.of(
                        "type", "function",
                        "function", Map.of(
                                "name", "get_upcoming_evaluations",
                                "description", "Lista las evaluaciones (PC, APF, exámenes) programadas para los cursos del estudiante. Cubre desde la semana actual hasta tres semanas posteriores (inclusive).",
                                "parameters", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "current_week", Map.of("type", "integer", "description", "Número de semana académica actual del ciclo (1 a 18).")
                                        ),
                                        "required", List.of("current_week")
                                )
                        )
                )
        );
    }
}
