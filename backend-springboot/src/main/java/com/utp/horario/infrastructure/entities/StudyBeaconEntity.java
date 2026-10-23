package com.utp.horario.infrastructure.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entidad JPA del agregado {@code StudyBeacon} (Fase 1.0: Networking universitario).
 * Tabla {@code study_beacons} generada automáticamente por ddl-auto:update.
 */
@Entity
@Table(name = "study_beacons")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyBeaconEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "host_id", length = 32, nullable = false)
    private String hostId;

    @Column(name = "host_name", length = 128)
    private String hostName;

    @Column(name = "host_avatar", length = 16)
    private String hostAvatar;

    @Column(length = 64, nullable = false)
    private String campus;

    @Column(name = "location_name", length = 128, nullable = false)
    private String locationName;

    @Column(name = "course_name", length = 128, nullable = false)
    private String courseName;

    @Column(name = "section_code", length = 32)
    private String sectionCode;

    @Column(columnDefinition = "TEXT")
    private String objective;

    @Column(name = "max_collaborators")
    private Integer maxCollaborators;

    @Column(name = "current_collaborators")
    private Integer currentCollaborators;

    @Column(length = 32)
    private String status;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
