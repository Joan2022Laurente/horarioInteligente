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

import java.time.LocalDateTime;

/**
 * Persistencia relacional (Fase de Normalización) de una clase programada del
 * calendario académico. Sustituye la lista plana {@code classes[]} del blob JSON
 * por filas consultables: ocupación de aulas por franja, distribución presencial
 * vs. virtual y cruces de horarios se resuelven con SQL analítico directo.
 *
 * <p>Diseño de la Fase de Normalización:</p>
 * <ul>
 *   <li>{@code schedule_id}: FK redundante e indexada al horario raíz, para consultas
 *       de calendario rápido sin atravesar la jerarquía cursos → sesiones.</li>
 *   <li>{@code course_id}: FK opcional (nullable) al curso del catálogo. La pasarela
 *       institucional puede emitir clases cuyo código o denominación no casan con el
 *       catálogo matriculado (p. ej. eventos de calendario con título libre); por
 *       honestidad la FK se queda nula en ese caso y los campos denormalizados
 *       {@code course_code}/{@code course_name}/{@code section} conservan el dato
 *       exacto para el Value Object {@code ClassSession} y para el análisis.</li>
 * </ul>
 */
@Entity
@Table(name = "schedule_sessions", indexes = {
    @Index(name = "idx_sched_session_schedule", columnList = "schedule_id"),
    @Index(name = "idx_sched_session_course", columnList = "course_id"),
    @Index(name = "idx_sched_session_start", columnList = "start_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleSessionEntity {

    /** Identificador de fila; prioriza el id de la clase cuando cabe en 36 caracteres. */
    @Id
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    /** FK redundantemente escrita para consultas de calendario por horario. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "schedule_id", nullable = false)
    private StudentScheduleEntity schedule;

    /** Lectura denormalizada de la FK redundante {@code schedule_id} (no escribe la columna). */
    @Column(name = "schedule_id", insertable = false, updatable = false)
    private String scheduleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private ScheduleCourseEntity course;

    // ── Denormalizaciones de paridad y análisis (copian el dato exacto del Value Object) ──

    @Column(name = "course_code", length = 128)
    private String courseCode;

    @Column(name = "course_name", length = 255)
    private String courseName;

    @Column(name = "section", length = 64)
    private String section;

    // ── Columnas atómicas de la sesión ──

    @Column(name = "classroom", length = 128)
    private String classroom;

    @Column(name = "building", length = 128)
    private String building;

    @Column(name = "floor", length = 32)
    private String floor;

    @Column(name = "teacher", length = 255)
    private String teacher;

    /** P (Presencial), R (Remoto), V (Virtual). */
    @Column(name = "modality", length = 16)
    private String modality;

    @Column(name = "start_at")
    private LocalDateTime startAt;

    @Column(name = "finish_at")
    private LocalDateTime finishAt;

    @Lob
    @Column(name = "zoom_link", columnDefinition = "TEXT")
    private String zoomLink;

    @Column(name = "environment_type", length = 128)
    private String environmentType;

    @Lob
    @Column(name = "class_link", columnDefinition = "TEXT")
    private String classLink;

    @Column(name = "section_id", length = 128)
    private String sectionId;
}
