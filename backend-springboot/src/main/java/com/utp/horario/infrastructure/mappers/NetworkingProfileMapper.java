package com.utp.horario.infrastructure.mappers;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.aggregate.StudentNetworkingProfile;
import com.utp.horario.infrastructure.entities.StudentNetworkingProfileEntity;
import com.utp.horario.interfaces.rest.dto.FreeWindowDto;
import com.utp.horario.interfaces.rest.dto.StudentNetworkingProfileDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Conversión {@code StudentNetworkingProfileEntity} ⇄ {@code StudentNetworkingProfile}
 * ⇄ DTO REST. Las colecciones de matching (cursos, ventanas libres, habilidades)
 * viajan como blobs JSON en la entidad y como estructuras tipadas en el DTO REST,
 * exactamente con la forma que el motor de matching del frontend consume.
 * El parseo JSON es defensivo: una columna corrupta nunca rompe el listado.
 */
@Component
@RequiredArgsConstructor
public class NetworkingProfileMapper {

    private final ObjectMapper objectMapper;

    public StudentNetworkingProfile toDomain(StudentNetworkingProfileEntity entity) {
        if (entity == null) return null;
        return StudentNetworkingProfile.builder()
                .studentCode(entity.getStudentCode())
                .fullName(entity.getFullName())
                .avatarLetter(entity.getAvatarLetter())
                .career(entity.getCareer())
                .campus(entity.getCampus())
                .cycle(entity.getCycle())
                .program(entity.getProgram())
                .enrolledCoursesJson(entity.getEnrolledCoursesJson())
                .freeWindowsJson(entity.getFreeWindowsJson())
                .skillsJson(entity.getSkillsJson())
                .matchIntent(entity.getMatchIntent())
                .contactChannelsJson(entity.getContactChannelsJson())
                .ghostMode(entity.isGhostMode())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public StudentNetworkingProfileEntity toEntity(StudentNetworkingProfile domain) {
        if (domain == null) return null;
        return StudentNetworkingProfileEntity.builder()
                .studentCode(domain.getStudentCode())
                .fullName(domain.getFullName())
                .avatarLetter(domain.getAvatarLetter())
                .career(domain.getCareer())
                .campus(domain.getCampus())
                .cycle(domain.getCycle())
                .program(domain.getProgram())
                .enrolledCoursesJson(domain.getEnrolledCoursesJson())
                .freeWindowsJson(domain.getFreeWindowsJson())
                .skillsJson(domain.getSkillsJson())
                .matchIntent(domain.getMatchIntent())
                .contactChannelsJson(domain.getContactChannelsJson())
                .ghostMode(domain.isGhostMode())
                .updatedAt(domain.getUpdatedAt())
                .build();
    }

    /** DTO de petición (sincronización) → agregado de dominio. */
    public StudentNetworkingProfile toDomain(StudentNetworkingProfileDto dto) {
        if (dto == null) return null;
        return StudentNetworkingProfile.builder()
                .studentCode(dto.getStudentCode())
                .fullName(dto.getFullName())
                .avatarLetter(dto.getAvatarLetter())
                .career(dto.getCareer())
                .campus(dto.getCampus())
                .cycle(dto.getCycle())
                .program(dto.getProgram())
                .enrolledCoursesJson(writeJson(dto.getEnrolledCourses()))
                .freeWindowsJson(writeJson(dto.getFreeWindows()))
                .skillsJson(writeJson(dto.getSkills()))
                .matchIntent(dto.getMatchIntent())
                .contactChannelsJson(writeJson(dto.getContactChannels()))
                .ghostMode(dto.isGhostMode())
                .updatedAt(parseIso(dto.getUpdatedAt()))
                .build();
    }

    /** Agregado de dominio → DTO de respuesta (contrato del Matching Dual). */
    public StudentNetworkingProfileDto toDto(StudentNetworkingProfile domain) {
        if (domain == null) return null;
        return StudentNetworkingProfileDto.builder()
                .studentCode(domain.getStudentCode())
                .fullName(domain.getFullName())
                .avatarLetter(domain.getAvatarLetter())
                .career(domain.getCareer())
                .campus(domain.getCampus())
                .cycle(domain.getCycle())
                .program(domain.getProgram())
                .enrolledCourses(readList(domain.getEnrolledCoursesJson(), new TypeReference<List<String>>() {}))
                .freeWindows(readList(domain.getFreeWindowsJson(), new TypeReference<List<FreeWindowDto>>() {}))
                .skills(readList(domain.getSkillsJson(), new TypeReference<List<String>>() {}))
                .matchIntent(domain.getMatchIntent())
                .contactChannels(readMap(domain.getContactChannelsJson()))
                .ghostMode(domain.isGhostMode())
                .updatedAt(domain.getUpdatedAt() != null ? domain.getUpdatedAt().toString() : null)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Utilidades JSON defensivas
    // ─────────────────────────────────────────────────────────────────────────

    private String writeJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return null;
        }
    }

    private <T> List<T> readList(String json, TypeReference<List<T>> type) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            return List.of();
        }
    }

    private Map<String, String> readMap(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private LocalDateTime parseIso(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return OffsetDateTime.parse(raw).toLocalDateTime();
        } catch (Exception ignored) {
            // formato local sin zona
        }
        try {
            return LocalDateTime.parse(raw);
        } catch (Exception ignored) {
            return null;
        }
    }
}
