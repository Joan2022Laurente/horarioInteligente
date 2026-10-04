package com.utp.horario.infraestructure.adapters;

import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.domain.model.repositories.IStudentRepository;
import com.utp.horario.infraestructure.entities.StudentEntity;
import com.utp.horario.infraestructure.mappers.StudentMapper;
import com.utp.horario.infraestructure.repositories.JPAStudentRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class StudentRepositoryAdapter implements IStudentRepository {

    private final JPAStudentRepository jpa;
    private final StudentMapper mapper;

    public StudentRepositoryAdapter(JPAStudentRepository jpa, StudentMapper mapper) {
        this.jpa = jpa;
        this.mapper = mapper;
    }

    @Override
    public StudentProfile save(StudentProfile studentProfile) {
        if (studentProfile == null) return null;

        if (studentProfile.getStudentCode() != null && !studentProfile.getStudentCode().isBlank()) {
            String code = studentProfile.getStudentCode().trim();
            Optional<StudentEntity> existingOpt = jpa.findByStudentCode(code);
            if (existingOpt.isEmpty()) {
                existingOpt = jpa.findByStudentCode(code.toUpperCase());
            }
            if (existingOpt.isEmpty()) {
                existingOpt = jpa.findByStudentCode(code.toLowerCase());
            }

            if (existingOpt.isPresent()) {
                StudentEntity existing = existingOpt.get();
                if (studentProfile.getFullName() != null && !studentProfile.getFullName().isBlank()) {
                    existing.setFullName(studentProfile.getFullName());
                }
                if (studentProfile.getEmail() != null && !studentProfile.getEmail().isBlank()) {
                    existing.setEmail(studentProfile.getEmail());
                }
                if (studentProfile.getCareer() != null && !studentProfile.getCareer().isBlank()) {
                    existing.setCareer(studentProfile.getCareer());
                }
                if (studentProfile.getCampus() != null && !studentProfile.getCampus().isBlank()) {
                    existing.setCampus(studentProfile.getCampus());
                }
                if (studentProfile.getCurrentCycle() != null && studentProfile.getCurrentCycle() > 0) {
                    existing.setCurrentCycle(studentProfile.getCurrentCycle());
                }
                return mapper.toDomain(jpa.save(existing));
            }
        }

        if (studentProfile.getId() == null || studentProfile.getId().isBlank()) {
            studentProfile.setId("usr-" + (studentProfile.getStudentCode() != null ? studentProfile.getStudentCode().toLowerCase() : java.util.UUID.randomUUID().toString()));
        }
        StudentEntity entity = mapper.toEntity(studentProfile);
        return mapper.toDomain(jpa.save(entity));
    }

    @Override
    public Optional<StudentProfile> findById(String id) {
        return jpa.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<StudentProfile> findByStudentCode(String studentCode) {
        return jpa.findByStudentCode(studentCode).map(mapper::toDomain);
    }

    @Override
    public Optional<StudentProfile> findByEmail(String email) {
        return jpa.findByEmail(email).map(mapper::toDomain);
    }

    @Override
    public StudentProfile update(StudentProfile studentProfile) {
        return save(studentProfile);
    }

    @Override
    public List<StudentProfile> list() {
        return jpa.findAll().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Boolean delete(String id) {
        if (jpa.existsById(id)) {
            jpa.deleteById(id);
            return true;
        }
        return false;
    }
}
