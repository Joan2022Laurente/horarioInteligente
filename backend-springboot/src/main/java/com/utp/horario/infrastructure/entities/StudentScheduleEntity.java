package com.utp.horario.infrastructure.entities;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "student_schedules", uniqueConstraints = {
    @UniqueConstraint(name = "uq_student_schedule_period", columnNames = {"student_code", "period_name"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentScheduleEntity {

    @Id
    private String id;

    @Column(name = "student_code", nullable = false, length = 32)
    private String studentCode;

    @Column(name = "period_name", nullable = false, length = 64)
    private String periodName;

    @Column(name = "week_number")
    private Integer weekNumber;

    @Column(name = "total_weeks")
    private Integer totalWeeks;

    /** Inicio del intervalo académico (paridad del Value Object {@code ScheduleInterval.startDate}). */
    @Column(name = "start_date")
    private LocalDate startDate;

    /** Fin del intervalo académico (paridad del Value Object {@code ScheduleInterval.endDate}). */
    @Column(name = "end_date")
    private LocalDate endDate;

    /**
     * Blob legacy del horario ({@code LONGTEXT}). Fase de Normalización: se conserva
     * como fallback de transición SOLO para lecturas de filas antiguas cuyas
     * colecciones relacionales siguen vacías; las escrituras nuevas lo limpian.
     */
    @Lob
    @Column(name = "schedule_data", columnDefinition = "LONGTEXT")
    private String scheduleData;

    @Column(name = "last_synced_date", nullable = false)
    private LocalDate lastSyncedDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
        if (lastSyncedDate == null) lastSyncedDate = LocalDate.now();
    }

    /**
     * Catálogo relacional de cursos matriculados (Fase de Normalización). El
     * guardado del agregado inserta/actualiza en cascada y {@code orphanRemoval}
     * elimina el catálogo desfasado de instantáneas anteriores.
     */
    @OneToMany(mappedBy = "schedule", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<ScheduleCourseEntity> courses = new LinkedHashSet<>();

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

