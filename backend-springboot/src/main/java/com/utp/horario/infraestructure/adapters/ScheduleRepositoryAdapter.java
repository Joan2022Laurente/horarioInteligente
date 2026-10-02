package com.utp.horario.infraestructure.adapters;

import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.value_objets.ScheduleInterval;
import com.utp.horario.infraestructure.entities.StudentScheduleEntity;
import com.utp.horario.infraestructure.mappers.ScheduleMapper;
import com.utp.horario.infraestructure.repositories.JPAScheduleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Repository
public class ScheduleRepositoryAdapter implements IScheduleRepository {

    private final JPAScheduleRepository jpa;
    private final ScheduleMapper mapper;
    private final ConcurrentHashMap<String, ScheduleInterval> l1Cache = new ConcurrentHashMap<>();

    public ScheduleRepositoryAdapter(JPAScheduleRepository jpa, ScheduleMapper mapper) {
        this.jpa = jpa;
        this.mapper = mapper;
    }

    @Override
    public ScheduleInterval save(String studentId, ScheduleInterval schedule) {
        String periodName = schedule.getPeriodName() != null ? schedule.getPeriodName() : "2026 - Ciclo 2 Agosto";
        String key = studentId + ":" + periodName;
        l1Cache.put(key, schedule);

        try {
            Optional<StudentScheduleEntity> existing = jpa.findByStudentCodeAndPeriodName(studentId, periodName);
            StudentScheduleEntity entity;

            if (existing.isPresent()) {
                entity = existing.get();
                entity.setWeekNumber(schedule.getWeekNumber());
                entity.setTotalWeeks(schedule.getTotalWeeks());
                StudentScheduleEntity mapped = mapper.toEntity(studentId, schedule);
                entity.setScheduleData(mapped.getScheduleData());
                entity.setLastSyncedDate(LocalDate.now());
                entity.setUpdatedAt(LocalDateTime.now());
            } else {
                entity = mapper.toEntity(studentId, schedule);
            }

            jpa.save(entity);
            log.info("Horario persistido en base de datos para alumno [{}] periodo [{}]", studentId, periodName);
        } catch (Exception e) {
            log.warn("No se pudo persistir en base de datos el horario de [{}]: {}", studentId, e.getMessage());
        }

        return schedule;
    }

    @Override
    public ScheduleInterval save(ScheduleInterval schedule) {
        return save("default", schedule);
    }

    @Override
    public Optional<ScheduleInterval> findByStudentIdAndPeriod(String studentId, String period) {
        String periodName = period != null ? period : "2026 - Ciclo 2 Agosto";
        String key = studentId + ":" + periodName;

        ScheduleInterval cached = l1Cache.get(key);
        if (cached != null) {
            return Optional.of(cached);
        }

        try {
            Optional<StudentScheduleEntity> entityOpt = jpa.findByStudentCodeAndPeriodName(studentId, periodName);
            if (entityOpt.isPresent()) {
                ScheduleInterval interval = mapper.toDomain(entityOpt.get());
                if (interval != null) {
                    l1Cache.put(key, interval);
                    return Optional.of(interval);
                }
            }
        } catch (Exception e) {
            log.warn("Error leyendo horario desde base de datos para [{}]: {}", studentId, e.getMessage());
        }

        return Optional.empty();
    }

    @Override
    public Optional<ScheduleInterval> findById(String id) {
        return jpa.findById(id).map(mapper::toDomain);
    }

    @Override
    public ScheduleInterval update(ScheduleInterval scheduleInterval) {
        return save(scheduleInterval);
    }

    @Override
    public List<ScheduleInterval> list() {
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
