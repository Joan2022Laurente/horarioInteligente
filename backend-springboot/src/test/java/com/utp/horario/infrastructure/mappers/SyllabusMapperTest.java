package com.utp.horario.infrastructure.mappers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.value_objects.SyllabusEvaluation;
import com.utp.horario.domain.model.value_objects.SyllabusWeeklySession;
import com.utp.horario.infrastructure.entities.SyllabusEntity;
import com.utp.horario.infrastructure.entities.SyllabusEvaluationEntity;
import com.utp.horario.infrastructure.entities.SyllabusWeeklySessionEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Paridad exacta (Fase de Normalización) entre el agregado {@link Syllabus} del
 * dominio (Java puro) y el grafo relacional de entidades:
 * {@code SyllabusEntity → {evaluaciones, cronograma semanal}}.
 */
class SyllabusMapperTest {

    private SyllabusMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new SyllabusMapper(new ObjectMapper().findAndRegisterModules());
    }

    private SyllabusEvaluation evaluation(String type, String name, Integer week, Integer weight,
                                          String modality, String observation, List<String> rules) {
        return SyllabusEvaluation.builder()
                .id(type)
                .type(type)
                .description(name)
                .week(week)
                .weightPercent(weight)
                .modality(modality)
                .observation(observation)
                .rules(rules)
                .build();
    }

    private SyllabusWeeklySession weekly(Integer week, Integer session, String unit,
                                         String topic, String activities, String evaluation) {
        return SyllabusWeeklySession.builder()
                .week(week)
                .session(session)
                .unit(unit)
                .topic(topic)
                .activities(activities)
                .evaluation(evaluation)
                .build();
    }

    /** Sílabo con la semántica del Quality Gate: fórmula y cronograma semanal no vacíos. */
    private Syllabus syllabus() {
        return Syllabus.builder()
                .id("100000SI58")
                .courseCode("100000SI58")
                .courseName("FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS")
                .semester("2026 - Ciclo 2 Agosto")
                .credits(3)
                .modality("Presencial")
                .weeklyHours(3)
                .careers(List.of("Ingeniería de Sistemas e Informática", "Sciences"))
                .learningGoal("Investigación tecnológica e innovación")
                .formula("15% [PC1] + 20% [PC2] + 25% [PA] + 40% [PROY]")
                .maxSimilarityPercent(20)
                .aiPolicy("Uso de IA permitido como apoyo, previa citación.")
                .evaluations(List.of(
                        evaluation("PC1", "Práctica Calificada 1", 4, 15, "Individual",
                                "Registra asistencia", List.of("Semana 4", "Ponderación 15%")),
                        evaluation("TB", "Trabajo Grupal", 9, 20, "Grupal", null, null)))
                .rules(List.of("Sílabo oficial UTP"))
                .weeklySchedule(List.of(
                        weekly(1, 1, "Planteamiento del Problema de Investigación",
                                "Definición del alcance", "Lecturas previas", null),
                        weekly(2, 1, "Estado del Arte",
                                "Revisión de literatura científica", null, "Entrega parcial")))
                .build();
    }

    @Test
    @DisplayName("toEntity descompone el agregado en filas atómicas con vínculos bidireccionales")
    void toEntityDescomponeEnFilasAtomicas() {
        SyllabusEntity entity = mapper.toEntity(syllabus());

        assertEquals("100000SI58", entity.getId());
        assertEquals("100000SI58", entity.getCourseCode());
        assertEquals(3, entity.getWeeklyHours());
        assertEquals("Investigación tecnológica e innovación", entity.getLearningGoal());
        assertEquals(20, entity.getMaxSimilarityPercent());
        assertEquals("Uso de IA permitido como apoyo, previa citación.", entity.getAiPolicy());
        // Escrituras nuevas limpian el blob legacy (el contenido vive ya relacional).
        assertNull(entity.getRawJsonData());

        // Paridad de listas cortas serializadas.
        assertEquals("Ingeniería de Sistemas e Informática;Sciences", entity.getCareersText());
        assertEquals("Sílabo oficial UTP", entity.getRulesText());

        // Evaluaciones: vínculo bidireccional y mapeo completo de campos.
        assertEquals(2, entity.getEvaluations().size());
        for (SyllabusEvaluationEntity evalRow : entity.getEvaluations()) {
            assertSyllabusEqualsEvalParent(entity, evalRow);
        }
        SyllabusEvaluationEntity pc1 = findEvaluation(entity, "PC1");
        assertEquals("Práctica Calificada 1", pc1.getEvaluationName());
        assertEquals(15.0, pc1.getWeightPercent());
        assertEquals(4, pc1.getWeekNumber());
        assertTrue(pc1.getIsIndividual());
        assertEquals("Registra asistencia", pc1.getObservation());
        assertEquals("Semana 4;Ponderación 15%", pc1.getRulesText());

        SyllabusEvaluationEntity tb = findEvaluation(entity, "TB");
        assertFalse(tb.getIsIndividual());
        assertNull(tb.getObservation());
        assertNull(tb.getRulesText());

        // Cronograma semanal con la unidad didáctica consumida por tools/LLM.
        assertEquals(2, entity.getWeeklySessions().size());
        SyllabusWeeklySessionEntity firstWeek = entity.getWeeklySessions().iterator().next();
        assertSyllabusEqualsWeekParent(entity, firstWeek);
    }

    @Test
    @DisplayName("toDomain reconstruye el agregado con paridad y el Quality Gate intacto")
    void toDomainReconstruyeConParidadYGatilloDeCalidad() {
        Syllabus original = syllabus();
        SyllabusEntity entity = mapper.toEntity(original);
        Syllabus rebuilt = mapper.toDomain(entity);

        // Paridad del agregado completo.
        assertEquals(original.getId(), rebuilt.getId());
        assertEquals(original.getCourseCode(), rebuilt.getCourseCode());
        assertEquals(original.getCourseName(), rebuilt.getCourseName());
        assertEquals(original.getSemester(), rebuilt.getSemester());
        assertEquals(original.getCredits(), rebuilt.getCredits());
        assertEquals(original.getModality(), rebuilt.getModality());
        assertEquals(original.getWeeklyHours(), rebuilt.getWeeklyHours());
        assertEquals(original.getCareers(), rebuilt.getCareers());
        assertEquals(original.getLearningGoal(), rebuilt.getLearningGoal());
        assertEquals(original.getFormula(), rebuilt.getFormula());
        assertEquals(original.getRules(), rebuilt.getRules());
        assertEquals(original.getMaxSimilarityPercent(), rebuilt.getMaxSimilarityPercent());
        assertEquals(original.getAiPolicy(), rebuilt.getAiPolicy());

        // Evaluaciones del dominio: id/type/week/weight/modality/observation/rules.
        assertEquals(2, rebuilt.getEvaluations().size());
        SyllabusEvaluation rebuiltPc1 = rebuilt.getEvaluations().stream()
                .filter(e -> "PC1".equals(e.getType())).findFirst().orElseThrow();
        assertEquals("Práctica Calificada 1", rebuiltPc1.getDescription());
        assertEquals(15, rebuiltPc1.getWeightPercent());
        assertEquals(4, rebuiltPc1.getWeek());
        assertEquals("Individual", rebuiltPc1.getModality());
        assertEquals("Registra asistencia", rebuiltPc1.getObservation());
        assertEquals(List.of("Semana 4", "Ponderación 15%"), rebuiltPc1.getRules());

        SyllabusEvaluation rebuiltTb = rebuilt.getEvaluations().stream()
                .filter(e -> "TB".equals(e.getType())).findFirst().orElseThrow();
        assertEquals("Grupal", rebuiltTb.getModality());

        // Cronograma semanal: paridad de week/session/unit/topic/activities/evaluation.
        assertEquals(2, rebuilt.getWeeklySchedule().size());
        SyllabusWeeklySession rebuiltWeek1 = rebuilt.getWeeklySchedule().get(0);
        assertEquals(1, rebuiltWeek1.getWeek());
        assertEquals(1, rebuiltWeek1.getSession());
        assertEquals("Planteamiento del Problema de Investigación", rebuiltWeek1.getUnit());
        assertEquals("Definición del alcance", rebuiltWeek1.getTopic());
        assertEquals("Lecturas previas", rebuiltWeek1.getActivities());
        assertNull(rebuiltWeek1.getEvaluation());

        // Quality Gate sobrevive a la normalización (fórmula + cronograma no vacíos).
        assertTrue(rebuilt.isComplete());
    }

    @Test
    @DisplayName("El blob legacy se usa solo si las colecciones relacionales están vacías")
    void fallbackLegacySoloSiRelacionalVacio() {
        SyllabusEntity legacy = SyllabusEntity.builder()
                .id("100000SI60")
                .courseCode("100000SI60")
                .courseName("DESARROLLO DE SOFTWARE AVANZADO")
                .semester("2026 - Ciclo 2 Agosto")
                .credits(4)
                .modality("Presencial")
                .weeklyHours(5)
                .formula("20% [PC1] + 20% [PC2] + 20% [TB] + 40% [EXFN]")
                .maxSimilarityPercent(20)
                .aiPolicy("Uso de IA permitido como apoyo, previa citación.")
                .careersText("Ingeniería de Sistemas e Informática")
                .rulesText("Sílabo oficial UTP")
                .rawJsonData("{\"courseCode\":\"100000SI60\",\"courseName\":\"DESARROLLO DE SOFTWARE AVANZADO\","
                        + "\"formula\":\"20% [PC1] + 20% [PC2] + 20% [TB] + 40% [EXFN]\","
                        + "\"weeklySchedule\":[{\"week\":1,\"session\":1,\"unit\":\"Domain-Driven Design (DDD)\","
                        + "\"topic\":\"Agregados y Entidades\"}]}")
                .evaluations(new java.util.LinkedHashSet<>())
                .weeklySessions(new java.util.LinkedHashSet<>())
                .build();

        Syllabus domain = mapper.toDomain(legacy);

        // Fallback: cronograma desde el blob + backfill atómico de columnas nuevas.
        assertEquals(1, domain.getWeeklySchedule().size());
        assertEquals("Domain-Driven Design (DDD)", domain.getWeeklySchedule().get(0).getUnit());
        assertEquals("Agregados y Entidades", domain.getWeeklySchedule().get(0).getTopic());
        assertEquals(5, domain.getWeeklyHours());
        assertEquals(20, domain.getMaxSimilarityPercent());
        assertEquals(List.of("Ingeniería de Sistemas e Informática"), domain.getCareers());
        assertTrue(domain.isComplete());
    }

    // ── Helpers ──

    private void assertSyllabusEqualsEvalParent(SyllabusEntity entity, SyllabusEvaluationEntity evalRow) {
        assertEquals(entity, evalRow.getSyllabus());
    }

    private void assertSyllabusEqualsWeekParent(SyllabusEntity entity, SyllabusWeeklySessionEntity weekRow) {
        assertEquals(entity, weekRow.getSyllabus());
    }

    private SyllabusEvaluationEntity findEvaluation(SyllabusEntity entity, String code) {
        return entity.getEvaluations().stream()
                .filter(e -> code.equals(e.getEvaluationCode()))
                .findFirst()
                .orElseThrow();
    }
}
