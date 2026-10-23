package com.utp.horario.infrastructure.mappers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.value_objects.SyllabusEvaluation;
import com.utp.horario.domain.model.value_objects.SyllabusWeeklySession;
import com.utp.horario.infrastructure.entities.SyllabusEntity;
import com.utp.horario.infrastructure.entities.SyllabusEvaluationEntity;
import com.utp.horario.infrastructure.entities.SyllabusWeeklySessionEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Mapper bidireccional entre el agregado {@link Syllabus} del dominio (Java puro,
 * sin JPA) y el grafo relacional de la Fase de Normalización:
 * {@link SyllabusEntity} → {evaluaciones, cronograma semanal}.
 *
 * <p>La semántica del Quality Gate del agregado ({@code Syllabus.isComplete()}:
 * fórmula de evaluación y cronograma semanal no vacíos) sobrevive al mapeo porque
 * las filas del cronograma se persisten y reconstruyen como listas de dominio.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SyllabusMapper {

    /** Listas cortas con paridad (careers, rules, rules de evaluación): separador documentado ';'. */
    private static final String LIST_SEPARATOR = ";";

    private final ObjectMapper objectMapper;

    /**
     * Reconstruye el agregado desde el grafo relacional.
     *
     * <p>Estrategia de transición segura: si las colecciones relacionales están
     * vacías y la fila conserva el blob legacy {@code raw_json_data}, se deserializa
     * el JSON antiguo (filas aún no resincronizadas) con backfill de columnas.</p>
     */
    public Syllabus toDomain(SyllabusEntity entity) {
        if (entity == null) return null;

        List<SyllabusEvaluation> evaluations = new ArrayList<>();
        if (entity.getEvaluations() != null) {
            for (SyllabusEvaluationEntity row : entity.getEvaluations()) {
                evaluations.add(toEvaluationDomain(row));
            }
        }
        List<SyllabusWeeklySession> weeks = new ArrayList<>();
        if (entity.getWeeklySessions() != null) {
            for (SyllabusWeeklySessionEntity row : entity.getWeeklySessions()) {
                weeks.add(toWeeklyDomain(row));
            }
        }

        Syllabus domain;
        if (evaluations.isEmpty() && weeks.isEmpty()
                && entity.getRawJsonData() != null && !entity.getRawJsonData().isBlank()) {
            try {
                domain = objectMapper.readValue(entity.getRawJsonData(), Syllabus.class);
            } catch (Exception e) {
                log.warn("Fallback legacy fallido para sílabo [{}]: {}", entity.getCourseCode(), e.getMessage());
                domain = Syllabus.builder().build();
            }
        } else {
            domain = Syllabus.builder()
                    .id(entity.getId())
                    .courseCode(entity.getCourseCode())
                    .courseName(entity.getCourseName())
                    .semester(entity.getSemester())
                    .credits(entity.getCredits())
                    .modality(entity.getModality())
                    .weeklyHours(entity.getWeeklyHours())
                    .careers(new ArrayList<>(splitList(entity.getCareersText())))
                    .learningGoal(entity.getLearningGoal())
                    .formula(entity.getFormula())
                    .evaluations(evaluations)
                    .rules(new ArrayList<>(splitList(entity.getRulesText())))
                    .maxSimilarityPercent(entity.getMaxSimilarityPercent())
                    .aiPolicy(entity.getAiPolicy())
                    .weeklySchedule(weeks)
                    .build();
        }

        // Backfill de columnas atómicas para filas legacy (paridad con el comportamiento anterior).
        if (domain.getId() == null) domain.setId(entity.getId());
        if (domain.getCourseCode() == null) domain.setCourseCode(entity.getCourseCode());
        if (domain.getCourseName() == null) domain.setCourseName(entity.getCourseName());
        if (domain.getSemester() == null) domain.setSemester(entity.getSemester());
        if (domain.getCredits() == null) domain.setCredits(entity.getCredits());
        if (domain.getModality() == null) domain.setModality(entity.getModality());
        if (domain.getWeeklyHours() == null) domain.setWeeklyHours(entity.getWeeklyHours());
        if (domain.getCareers() == null) domain.setCareers(new ArrayList<>(splitList(entity.getCareersText())));
        if (domain.getLearningGoal() == null) domain.setLearningGoal(entity.getLearningGoal());
        if (domain.getFormula() == null) domain.setFormula(entity.getFormula());
        if (domain.getRules() == null) domain.setRules(new ArrayList<>(splitList(entity.getRulesText())));
        if (domain.getMaxSimilarityPercent() == null) domain.setMaxSimilarityPercent(entity.getMaxSimilarityPercent());
        if (domain.getAiPolicy() == null) domain.setAiPolicy(entity.getAiPolicy());

        return domain;
    }

    /** Convierte el agregado en el grafo relacional (cada guardado es una instantánea nueva). */
    public SyllabusEntity toEntity(Syllabus syllabus) {
        if (syllabus == null) return null;
        SyllabusEntity entity = SyllabusEntity.builder()
                .id(syllabus.getId())
                .courseCode(syllabus.getCourseCode())
                .courseName(syllabus.getCourseName())
                .semester(syllabus.getSemester())
                .credits(syllabus.getCredits())
                .modality(syllabus.getModality())
                .weeklyHours(syllabus.getWeeklyHours())
                .careersText(joinList(syllabus.getCareers()))
                .learningGoal(syllabus.getLearningGoal())
                .formula(syllabus.getFormula())
                .maxSimilarityPercent(syllabus.getMaxSimilarityPercent())
                .aiPolicy(syllabus.getAiPolicy())
                .rulesText(joinList(syllabus.getRules()))
                .evaluations(new java.util.LinkedHashSet<>())
                .weeklySessions(new java.util.LinkedHashSet<>())
                .build();

        if (syllabus.getEvaluations() != null) {
            for (SyllabusEvaluation evaluation : syllabus.getEvaluations()) {
                entity.getEvaluations().add(toEvaluationEntity(entity, evaluation));
            }
        }
        if (syllabus.getWeeklySchedule() != null) {
            for (SyllabusWeeklySession weekly : syllabus.getWeeklySchedule()) {
                entity.getWeeklySessions().add(toWeeklyEntity(entity, weekly));
            }
        }
        return entity;
    }

    // ── Evaluaciones ──

    private SyllabusEvaluationEntity toEvaluationEntity(SyllabusEntity parent, SyllabusEvaluation evaluation) {
        SyllabusEvaluationEntity row = SyllabusEvaluationEntity.builder()
                .id(rowId(evaluation.getId()))
                .evaluationName(evaluation.getDescription())
                .evaluationCode(evaluation.getType())
                .weightPercent(evaluation.getWeightPercent() == null ? null
                        : evaluation.getWeightPercent().doubleValue())
                .weekNumber(evaluation.getWeek())
                .isIndividual(evaluation.getModality() == null ? null
                        : "Individual".equalsIgnoreCase(evaluation.getModality()))
                .observation(evaluation.getObservation())
                .rulesText(joinList(evaluation.getRules()))
                .build();
        row.setSyllabus(parent);
        return row;
    }

    private SyllabusEvaluation toEvaluationDomain(SyllabusEvaluationEntity row) {
        return SyllabusEvaluation.builder()
                .id(row.getId())
                .type(row.getEvaluationCode())
                .description(row.getEvaluationName())
                .week(row.getWeekNumber())
                .weightPercent(row.getWeightPercent() == null ? null
                        : (int) Math.round(row.getWeightPercent()))
                .modality(row.getIsIndividual() == null ? null
                        : (row.getIsIndividual() ? "Individual" : "Grupal"))
                .observation(row.getObservation())
                .rules(new ArrayList<>(splitList(row.getRulesText())))
                .build();
    }

    // ── Cronograma semanal ──

    private SyllabusWeeklySessionEntity toWeeklyEntity(SyllabusEntity parent, SyllabusWeeklySession weekly) {
        SyllabusWeeklySessionEntity row = SyllabusWeeklySessionEntity.builder()
                .id(UUID.randomUUID().toString())
                .weekNumber(weekly.getWeek())
                .sessionNumber(weekly.getSession())
                .unit(weekly.getUnit())
                .topics(weekly.getTopic())
                .learningActivities(weekly.getActivities())
                .evaluationDescription(weekly.getEvaluation())
                .build();
        row.setSyllabus(parent);
        return row;
    }

    private SyllabusWeeklySession toWeeklyDomain(SyllabusWeeklySessionEntity row) {
        return SyllabusWeeklySession.builder()
                .week(row.getWeekNumber())
                .session(row.getSessionNumber())
                .unit(row.getUnit())
                .topic(row.getTopics())
                .activities(row.getLearningActivities())
                .evaluation(row.getEvaluationDescription())
                .build();
    }

    // ── Serialización de listas cortas con paridad (separador documentado ';') ──

    private List<String> splitList(String text) {
        if (text == null || text.isBlank()) return new ArrayList<>();
        return Arrays.stream(text.split("\\s*;\\s*"))
                .filter(item -> !item.isBlank())
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private String joinList(List<String> items) {
        if (items == null || items.isEmpty()) return null;
        return String.join(LIST_SEPARATOR, items);
    }

    private String rowId(String candidate) {
        return candidate != null && !candidate.isBlank() && candidate.trim().length() <= 36
                ? candidate.trim()
                : UUID.randomUUID().toString();
    }
}
