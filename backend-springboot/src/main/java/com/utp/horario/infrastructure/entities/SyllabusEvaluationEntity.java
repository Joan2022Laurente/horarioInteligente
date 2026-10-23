package com.utp.horario.infrastructure.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Persistencia relacional (Fase de Normalización) de una evaluación declarada en
 * el sílabo oficial. Sustituye la porción {@code evaluations[]} del blob
 * {@code raw_json_data} por filas atómicas consultables (1NF): sumatorios de
 * pesos por semana, distribución de tipos (PC1, PROY, EF...) y modalidad
 * individual vs. grupal pasan a ser consultas SQL directas.
 *
 * <p>Paridad con el Value Object {@code SyllabusEvaluation}:</p>
 * <ul>
 *   <li>{@code evaluation_code} ⇄ {@code type} (PC1, PC2, ATI1, PROY, PA, EF).</li>
 *   <li>{@code evaluation_name} ⇄ {@code description}.</li>
 *   <li>{@code weight_percent} ⇄ {@code weightPercent} (DOUBLE ↔ Integer, redondeo).</li>
 *   <li>{@code week_number} ⇄ {@code week}.</li>
 *   <li>{@code is_individual} ⇄ {@code modality} ("Individual"/"Grupal").</li>
 *   <li>{@code observation} ⇄ {@code observation} (emitida por la pasarela).</li>
 *   <li>{@code rules_text} ⇄ {@code rules} (lista atómica serializada con ';').</li>
 * </ul>
 */
@Entity
@Table(name = "syllabus_evaluations", indexes = {
    @Index(name = "idx_syllabus_eval_syllabus", columnList = "syllabus_id"),
    @Index(name = "idx_syllabus_eval_week", columnList = "week_number")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyllabusEvaluationEntity {

    /** Identificador de fila; prioriza el id del Value Object ({@code type}, p. ej. "PC1") cuando cabe en 36 caracteres. */
    @Id
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "syllabus_id", nullable = false)
    private SyllabusEntity syllabus;

    @Column(name = "evaluation_name", length = 128)
    private String evaluationName;

    @Column(name = "evaluation_code", length = 32)
    private String evaluationCode;

    @Column(name = "weight_percent")
    private Double weightPercent;

    @Column(name = "week_number")
    private Integer weekNumber;

    @Column(name = "is_individual")
    private Boolean isIndividual;

    @Lob
    @Column(name = "observation", columnDefinition = "TEXT")
    private String observation;

    /** Reglas del ítem (lista del dominio) serializada en orden con separador ';'. */
    @Lob
    @Column(name = "rules_text", columnDefinition = "TEXT")
    private String rulesText;
}
