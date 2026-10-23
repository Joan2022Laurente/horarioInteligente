package com.utp.horario.infrastructure.entities;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "official_syllabi")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyllabusEntity {
    @Id
    @Column(name = "course_id")
    private String id;

    @Column(name = "course_code")
    private String courseCode;

    @Column(name = "course_name")
    private String courseName;
    private String semester;
    private Integer credits;
    private String modality;

    /** Horas semanales oficiales del curso (columna atómica de la Fase de Normalización). */
    @Column(name = "weekly_hours")
    private Integer weeklyHours;

    private String formula;

    /** Meta de aprendizaje del curso (columna atómica, TEXT). */
    @Lob
    @Column(name = "learning_goal", columnDefinition = "TEXT")
    private String learningGoal;

    /** Umbral de similaridad permitido por el curso (porcentaje entero). */
    @Column(name = "max_similarity_percent")
    private Integer maxSimilarityPercent;

    /** Política de uso de IA declarada en el sílabo (columna atómica, TEXT). */
    @Lob
    @Column(name = "ai_policy", columnDefinition = "TEXT")
    private String aiPolicy;

    /**
     * Carreras asociadas al curso (paridad del agregado {@code Syllabus.careers});
     * lista corta serializada en orden con separador ';' — denormalización deliberada
     * documentada de la Fase de Normalización.
     */
    @Lob
    @Column(name = "careers_text", columnDefinition = "TEXT")
    private String careersText;

    /** Reglas generales del sílabo (paridad del agregado {@code Syllabus.rules}); lista serializada con ';'. */
    @Lob
    @Column(name = "rules_text", columnDefinition = "TEXT")
    private String rulesText;

    /**
     * Blob legacy del sílabo ({@code LONGTEXT}). Fase de Normalización: fallback de
     * transición SOLO cuando las colecciones relacionales siguen vacías; las
     * escrituras nuevas lo limpian.
     */
    @Lob
    @Column(name = "raw_json_data", columnDefinition = "LONGTEXT")
    private String rawJsonData;

    /** Evaluaciones del sílabo en tablas relacionales (cascade + orphanRemoval en cada snapshot). */
    @OneToMany(mappedBy = "syllabus", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<SyllabusEvaluationEntity> evaluations = new LinkedHashSet<>();

    /** Cronograma semanal del sílabo en tablas relacionales (cascade + orphanRemoval en cada snapshot). */
    @OneToMany(mappedBy = "syllabus", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<SyllabusWeeklySessionEntity> weeklySessions = new LinkedHashSet<>();
}

