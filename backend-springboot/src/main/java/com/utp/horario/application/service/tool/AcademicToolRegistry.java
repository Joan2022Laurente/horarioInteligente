package com.utp.horario.application.service.tool;

import java.util.List;
import java.util.Map;

public class AcademicToolRegistry {

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
                                                "student_code", Map.of("type", "string", "description", "Código de estudiante UTP (ej. U19204085). Opcional."),
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
                                        "properties", Map.of(
                                                "student_code", Map.of("type", "string", "description", "Código de estudiante UTP (ej. U19204085). Opcional.")
                                        )
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
                                "description", "Lista las evaluaciones (PC, APF, exámenes) programadas en las próximas 3 semanas para los cursos del estudiante.",
                                "parameters", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "student_code", Map.of("type", "string", "description", "Código de estudiante UTP (ej. U19204085). Opcional."),
                                                "current_week", Map.of("type", "integer", "description", "Número de semana académica actual del ciclo (1 a 18).")
                                        ),
                                        "required", List.of("current_week")
                                )
                        )
                )
        );
    }
}
