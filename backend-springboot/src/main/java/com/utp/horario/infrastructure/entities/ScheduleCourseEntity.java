package com.utp.horario.infrastructure.entities;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Persistencia relacional (Fase de Normalización) de un curso matriculado dentro
 * del horario de un estudiante. Sustituye la lista {@code courses[]} del blob JSON
 * por filas atómicas consultables (1NF): ocupación de aulas, cargas horarias y
 * cruce entre docentes y módulos pasan a ser consultas SQL directas.
 *
 * <p>Colección en {@link LinkedHashSet} (en lugar de {@code List}): permite un solo
 * {@code JOIN FETCH} anidado hacia {@link ScheduleSessionEntity} sin la excepción
 * de Hibernate {@code MultipleBagFetchException}, conservando el orden de inserción
 * del dominio.</p>
 */
@Entity
@Table(name = "schedule_courses", indexes = {
    @Index(name = "idx_sched_course_schedule", columnList = "schedule_id"),
    @Index(name = "idx_sched_course_code", columnList = "course_code")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleCourseEntity {

    /** Identificador de fila; prioriza el id del Value Object {@code Course.id} cuando cabe en 36 caracteres. */
    @Id
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "schedule_id", nullable = false)
    private StudentScheduleEntity schedule;

    @Column(name = "course_code", length = 128)
    private String courseCode;

    @Column(name = "course_name", length = 255, nullable = false)
    private String courseName;

    @Column(name = "section", length = 64)
    private String section;

    @Column(name = "credits")
    private Integer credits;

    @Column(name = "teacher", length = 255)
    private String teacher;

    @Column(name = "modality", length = 32)
    private String modality;

    @Column(name = "weekly_hours")
    private Integer weeklyHours;

    /**
     * Bloques de clase del curso. La FK redundante {@code schedule_id} en el hijo
     * (Fase de Normalización) permite además reconstruir el calendario plano del
     * intervalo con una sola consulta indexada por horario.
     */
    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<ScheduleSessionEntity> sessions = new LinkedHashSet<>();
}
