package com.utp.horario.infrastructure.adapters;

import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import com.utp.horario.domain.model.repositories.ITaskSyncRepository;
import com.utp.horario.infrastructure.entities.TaskSyncEntity;
import com.utp.horario.infrastructure.mappers.TaskSyncMapper;
import com.utp.horario.infrastructure.repositories.JPATaskRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Slf4j
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

    /**
     * Caché persistida vigente: contrasta la marca {@code lastSyncedDate} de cada
     * fila. Las filas legacy (sin marca) quedan excluidas — se consideran vencidas
     * hasta la próxima sincronización oficial, coherente con la política del
     * horario ({@code findByStudentIdAndPeriodSyncedSince}).
     */
    @Override
    public List<TaskSyncItem> findByStudentIdSyncedSince(String studentId, LocalDate minSyncDate) {
        try {
            return jpa.findByStudentId(studentId).stream()
                    .filter(entity -> entity.getLastSyncedDate() != null
                            && !entity.getLastSyncedDate().isBefore(minSyncDate))
                    .map(mapper::toDomain)
                    .toList();
        } catch (Exception e) {
            log.warn("Error validando vigencia de actividades en base de datos para [{}]: {}", studentId, e.getMessage());
            return List.of();
        }
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
