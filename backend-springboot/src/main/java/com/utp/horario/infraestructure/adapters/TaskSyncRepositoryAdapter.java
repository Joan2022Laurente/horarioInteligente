package com.utp.horario.infraestructure.adapters;

import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import com.utp.horario.domain.model.repositories.ITaskSyncRepository;
import com.utp.horario.infraestructure.entities.TaskSyncEntity;
import com.utp.horario.infraestructure.mappers.TaskSyncMapper;
import com.utp.horario.infraestructure.repositories.JPATaskRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class TaskSyncRepositoryAdapter implements ITaskSyncRepository {

    private final JPATaskRepository jpa;
    private final TaskSyncMapper mapper;

    public TaskSyncRepositoryAdapter(JPATaskRepository jpa, TaskSyncMapper mapper) {
        this.jpa = jpa;
        this.mapper = mapper;
    }

    @Override
    public TaskSyncItem save(TaskSyncItem task) {
        TaskSyncEntity entity = mapper.toEntity(task);
        TaskSyncEntity saved = jpa.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public List<TaskSyncItem> saveAll(List<TaskSyncItem> tasks) {
        List<TaskSyncEntity> entities = tasks.stream().map(mapper::toEntity).toList();
        return jpa.saveAll(entities).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<TaskSyncItem> findByStudentId(String studentId) {
        return jpa.findByStudentId(studentId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<TaskSyncItem> findById(String id) {
        return jpa.findById(id).map(mapper::toDomain);
    }

    @Override
    public TaskSyncItem update(TaskSyncItem taskSyncItem) {
        return save(taskSyncItem);
    }

    @Override
    public List<TaskSyncItem> list() {
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
