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
