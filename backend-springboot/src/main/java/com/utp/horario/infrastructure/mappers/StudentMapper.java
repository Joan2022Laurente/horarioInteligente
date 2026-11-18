package com.utp.horario.infrastructure.mappers;

import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.infrastructure.entities.StudentEntity;
import org.springframework.stereotype.Component;

@Component
public class StudentMapper {

    public StudentProfile toDomain(StudentEntity entity) {
        if (entity == null) return null;
        return StudentProfile.builder()
                .id(entity.getId())
                .studentCode(entity.getStudentCode())
                .fullName(entity.getFullName())
                .email(entity.getEmail())
                .career(entity.getCareer())
                .campus(entity.getCampus())
                .currentCycle(entity.getCurrentCycle())
                .phoneWhatsapp(entity.getPhoneWhatsapp())
                .avatarUrl(entity.getAvatarUrl())
                .socialLink(entity.getSocialLink())
                .campusLocation(entity.getCampusLocation())
                .bio(entity.getBio())
                .build();
    }

    public StudentEntity toEntity(StudentProfile domain) {
        if (domain == null) return null;
        return StudentEntity.builder()
                .id(domain.getId())
                .studentCode(domain.getStudentCode())
                .fullName(domain.getFullName())
                .email(domain.getEmail())
                .career(domain.getCareer())
                .campus(domain.getCampus())
                .currentCycle(domain.getCurrentCycle())
                .phoneWhatsapp(domain.getPhoneWhatsapp())
                .avatarUrl(domain.getAvatarUrl())
                .socialLink(domain.getSocialLink())
                .campusLocation(domain.getCampusLocation())
                .bio(domain.getBio())
                .build();
    }
}

