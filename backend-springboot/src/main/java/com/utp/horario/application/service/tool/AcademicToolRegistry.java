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
                                                "date", Map.of("type", "string", "description", "Fecha en formato ISO YYYY-MM-DD. Opcional, por defecto hoy.")
                                        )
                                )
                        )
                ),
                Map.of(
                        "type", "function",
                        "function", Map.of(
                                "name", "get_syllabus_details",
                                "description", "Devuelve los detalles académicos oficiales de un curso: fórmula de nota final, ponderaciones de evaluación y logro de aprendizaje.",
                                "parameters", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "course_code", Map.of("type", "string", "description", "Código o sigla del curso (ej. 100000I04N o ST61).")
                                        ),
                                        "required", List.of("course_code")
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
                                                "current_week", Map.of("type", "integer", "description", "Número de semana académica actual del ciclo (1 a 18).")
                                        ),
                                        "required", List.of("current_week")
                                )
                        )
                )
        );
    }
}
