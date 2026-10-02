package com.utp.horario.infraestructure.mappers;

import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.infraestructure.entities.StudentEntity;
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
                .build();
    }
}

