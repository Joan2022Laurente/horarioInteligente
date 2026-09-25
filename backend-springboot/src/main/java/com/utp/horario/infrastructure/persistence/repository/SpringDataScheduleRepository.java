package com.utp.horario.infrastructure.persistence.repository;

import com.utp.horario.infrastructure.persistence.entity.StudentScheduleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SpringDataScheduleRepository extends JpaRepository<StudentScheduleEntity, String> {
    Optional<StudentScheduleEntity> findByStudentCodeAndPeriodName(String studentCode, String periodName);
    Optional<StudentScheduleEntity> findByStudentCode(String studentCode);
}
