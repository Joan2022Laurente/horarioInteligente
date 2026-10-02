package com.utp.horario.infraestructure.repositories;

import com.utp.horario.infraestructure.entities.StudentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JPAStudentRepository extends JpaRepository<StudentEntity, String> {
    Optional<StudentEntity> findByStudentCode(String studentCode);
    Optional<StudentEntity> findByEmail(String email);
}

