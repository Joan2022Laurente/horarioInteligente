package com.utp.horario.infrastructure.mappers;

import com.utp.horario.domain.model.aggregate.StudyBeacon;
import com.utp.horario.infrastructure.entities.StudyBeaconEntity;
import com.utp.horario.interfaces.rest.dto.StudyBeaconDto;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Conversión bidireccional {@code StudyBeaconEntity} ⇄ {@code StudyBeacon} y
 * proyección hacia el DTO REST en la frontera de interfaces.
 */
@Component
public class StudyBeaconMapper {

    public StudyBeacon toDomain(StudyBeaconEntity entity) {
        if (entity == null) return null;
        return StudyBeacon.builder()
                .id(entity.getId())
                .hostId(entity.getHostId())
                .hostName(entity.getHostName())
                .hostAvatar(entity.getHostAvatar())
                .campus(entity.getCampus())
                .locationName(entity.getLocationName())
                .courseName(entity.getCourseName())
                .sectionCode(entity.getSectionCode())
                .objective(entity.getObjective())
                .maxCollaborators(entity.getMaxCollaborators() != null ? entity.getMaxCollaborators() : 4)
                .currentCollaborators(entity.getCurrentCollaborators() != null ? entity.getCurrentCollaborators() : 1)
                .status(entity.getStatus())
                .expiresAt(entity.getExpiresAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    public StudyBeaconEntity toEntity(StudyBeacon domain) {
        if (domain == null) return null;
        return StudyBeaconEntity.builder()
                .id(domain.getId())
                .hostId(domain.getHostId())
                .hostName(domain.getHostName())
                .hostAvatar(domain.getHostAvatar())
                .campus(domain.getCampus())
                .locationName(domain.getLocationName())
                .courseName(domain.getCourseName())
                .sectionCode(domain.getSectionCode())
                .objective(domain.getObjective())
                .maxCollaborators(domain.getMaxCollaborators())
                .currentCollaborators(domain.getCurrentCollaborators())
                .status(domain.getStatus())
                .expiresAt(domain.getExpiresAt())
                .createdAt(domain.getCreatedAt())
                .build();
    }

    public StudyBeaconDto toDto(StudyBeacon domain) {
        if (domain == null) return null;
        return StudyBeaconDto.builder()
                .id(domain.getId())
                .hostId(domain.getHostId())
                .hostName(domain.getHostName())
                .hostAvatar(domain.getHostAvatar())
                .campus(domain.getCampus())
                .locationName(domain.getLocationName())
                .courseName(domain.getCourseName())
                .sectionCode(domain.getSectionCode())
                .objective(domain.getObjective())
                .maxCollaborators(domain.getMaxCollaborators())
                .currentCollaborators(domain.getCurrentCollaborators())
                .status(domain.getStatus())
                .expiresAt(domain.getExpiresAt())
                .createdAt(domain.getCreatedAt())
                .build();
    }

    public List<StudyBeaconDto> toDtoList(List<StudyBeacon> domains) {
        if (domains == null || domains.isEmpty()) return List.of();
        return domains.stream().map(this::toDto).toList();
    }
}
