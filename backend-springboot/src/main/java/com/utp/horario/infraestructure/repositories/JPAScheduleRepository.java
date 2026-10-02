package com.utp.horario.infraestructure.repositories;

import com.utp.horario.infraestructure.entities.StudentScheduleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JPAScheduleRepository extends JpaRepository<StudentScheduleEntity, String> {
    Optional<StudentScheduleEntity> findByStudentCodeAndPeriodName(String studentCode, String periodName);
    Optional<StudentScheduleEntity> findByStudentCode(String studentCode);
}

