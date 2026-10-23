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
 * Entidad JPA del agregado {@code StudentNetworkingProfile} (Fase 1.0).
 * Las colecciones de dominio (cursos matriculados, ventanas libres, habilidades y
 * canales de contacto) se persisten como blobs JSON en columnas TEXT: el matching
 * se calcula en el cliente sobre perfiles completos; la relacional estricta queda
 * reservada para catálogos oficiales (fase 0.9).
 */
@Entity
@Table(name = "student_networking_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentNetworkingProfileEntity {

    @Id
    @Column(name = "student_code", length = 32)
    private String studentCode;

    @Column(name = "full_name", length = 128, nullable = false)
    private String fullName;

    @Column(name = "avatar_letter", length = 8)
    private String avatarLetter;

    @Column(length = 128)
    private String career;

    @Column(length = 64)
    private String campus;

    @Column
    private Integer cycle;

    @Column(length = 64)
    private String program;

    @Column(name = "enrolled_courses_json", columnDefinition = "TEXT")
    private String enrolledCoursesJson;

    @Column(name = "free_windows_json", columnDefinition = "TEXT")
    private String freeWindowsJson;

    @Column(name = "skills_json", columnDefinition = "TEXT")
    private String skillsJson;

    @Column(name = "match_intent", length = 64)
    private String matchIntent;

    @Column(name = "contact_channels_json", columnDefinition = "TEXT")
    private String contactChannelsJson;

    @Column(name = "ghost_mode")
    private boolean ghostMode;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
