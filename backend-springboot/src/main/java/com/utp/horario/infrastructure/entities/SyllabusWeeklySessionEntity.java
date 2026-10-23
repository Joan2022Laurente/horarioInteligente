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
 * Persistencia relacional (Fase de Normalización) de una sesión semanal del
 * cronograma del sílabo oficial. Sustituye la porción {@code weeklySchedule[]}
 * del blob {@code raw_json_data} por filas atómicas consultables (1NF): avance
 * unitario por semana, horas a la semana por unidad didáctica y cronogramas de
 * contenidos pasan a ser consultas SQL directas.
 *
 * <p>Paridad con el Value Object {@code SyllabusWeeklySession}:</p>
 * <ul>
 *   <li>{@code week_number} ⇄ {@code week}.</li>
 *   <li>{@code session_number} ⇄ {@code session}.</li>
 *   <li>{@code unit} ⇄ {@code unit} (consumida por las herramientas académicas y el prompt del LLM).</li>
 *   <li>{@code topics} ⇄ {@code topic}.</li>
 *   <li>{@code learning_activities} ⇄ {@code activities}.</li>
 *   <li>{@code evaluation_description} ⇄ {@code evaluation}.</li>
 * </ul>
 */
@Entity
@Table(name = "syllabus_weekly_sessions", indexes = {
    @Index(name = "idx_syllabus_week_syllabus", columnList = "syllabus_id"),
    @Index(name = "idx_syllabus_week_number", columnList = "week_number")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyllabusWeeklySessionEntity {

    /** Identificador de fila (UUID generado por el mapper; cada guardado es una instantánea nueva). */
    @Id
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "syllabus_id", nullable = false)
    private SyllabusEntity syllabus;

    @Column(name = "week_number")
    private Integer weekNumber;

    @Column(name = "session_number")
    private Integer sessionNumber;

    @Column(name = "unit", length = 255)
    private String unit;

    @Lob
    @Column(name = "topics", columnDefinition = "TEXT")
    private String topics;

    @Lob
    @Column(name = "learning_activities", columnDefinition = "TEXT")
    private String learningActivities;

    @Column(name = "evaluation_description", length = 255)
    private String evaluationDescription;
}
