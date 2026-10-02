package com.utp.horario.domain.model.repositories;

import com.utp.horario.domain.model.aggregate.TaskSyncItem;

import java.util.List;

public interface ITaskSyncRepository extends ICRUD<TaskSyncItem, String> {
    List<TaskSyncItem> saveAll(List<TaskSyncItem> tasks);
    List<TaskSyncItem> findByStudentId(String studentId);
}
