package com.utp.horario.infrastructure.persistence.adapter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.ScheduleInterval;
import com.utp.horario.domain.port.out.ScheduleRepositoryPort;
import com.utp.horario.infrastructure.persistence.entity.StudentScheduleEntity;
import com.utp.horario.infrastructure.persistence.repository.SpringDataScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduleRepositoryAdapter implements ScheduleRepositoryPort {

    private final SpringDataScheduleRepository repository;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, ScheduleInterval> l1Cache = new ConcurrentHashMap<>();

    @Override
    public ScheduleInterval save(String studentId, ScheduleInterval schedule) {
        String periodName = schedule.getPeriodName() != null ? schedule.getPeriodName() : "2026 - Ciclo 2 Agosto";
        String key = studentId + ":" + periodName;
        l1Cache.put(key, schedule);

        try {
            String jsonPayload = objectMapper.writeValueAsString(schedule);
            Optional<StudentScheduleEntity> existing = repository.findByStudentCodeAndPeriodName(studentId, periodName);

            StudentScheduleEntity entity;
            if (existing.isPresent()) {
                entity = existing.get();
                entity.setWeekNumber(schedule.getWeekNumber());
                entity.setTotalWeeks(schedule.getTotalWeeks());
                entity.setScheduleData(jsonPayload);
                entity.setLastSyncedDate(LocalDate.now());
                entity.setUpdatedAt(LocalDateTime.now());
            } else {
                entity = StudentScheduleEntity.builder()
                        .studentCode(studentId)
                        .periodName(periodName)
                        .weekNumber(schedule.getWeekNumber())
                        .totalWeeks(schedule.getTotalWeeks())
                        .scheduleData(jsonPayload)
                        .lastSyncedDate(LocalDate.now())
                        .build();
            }

            repository.save(entity);
            log.info("⚡ Horario persistido en base de datos para alumno [{}] periodo [{}]", studentId, periodName);
        } catch (Exception e) {
            log.warn("ℹ️ No se pudo persistir en base de datos el horario de [{}]: {}", studentId, e.getMessage());
        }

        return schedule;
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
            Optional<StudentScheduleEntity> entityOpt = repository.findByStudentCodeAndPeriodName(studentId, periodName);
            if (entityOpt.isPresent()) {
                StudentScheduleEntity entity = entityOpt.get();
                if (entity.getScheduleData() != null && !entity.getScheduleData().isBlank()) {
                    ScheduleInterval interval = objectMapper.readValue(entity.getScheduleData(), ScheduleInterval.class);
                    l1Cache.put(key, interval);
                    return Optional.of(interval);
                }
            }
        } catch (Exception e) {
            log.warn("ℹ️ Error leyendo horario desde base de datos para [{}]: {}", studentId, e.getMessage());
        }

        return Optional.empty();
    }
}
