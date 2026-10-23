package com.utp.horario.infrastructure.repositories;

import com.utp.horario.infrastructure.entities.TaskSyncEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JPATaskRepository extends JpaRepository<TaskSyncEntity, String> {
    List<TaskSyncEntity> findByStudentId(String studentId);
}

