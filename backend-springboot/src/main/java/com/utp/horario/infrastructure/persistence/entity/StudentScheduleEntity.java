package com.utp.horario.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
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

    @Lob
    @Column(name = "schedule_data", columnDefinition = "TEXT")
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

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
