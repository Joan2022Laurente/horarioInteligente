package com.utp.horario.domain.model.repositories;

import com.utp.horario.domain.model.aggregate.TaskSyncItem;

import java.time.LocalDate;
import java.util.List;

public interface ITaskSyncRepository extends ICRUD<TaskSyncItem, String> {
    List<TaskSyncItem> saveAll(List<TaskSyncItem> tasks);
    List<TaskSyncItem> findByStudentId(String studentId);

    /**
     * Actividades cuya última sincronización oficial es de fecha o posterior a
     * {@code minSyncDate} (caché persistida vigente). Lectura pura del Read
     * Model: nunca consulta la pasarela externa.
     */
    List<TaskSyncItem> findByStudentIdSyncedSince(String studentId, LocalDate minSyncDate);
}
