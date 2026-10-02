package com.utp.horario.infraestructure.mappers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.value_objets.ScheduleInterval;
import com.utp.horario.infraestructure.entities.StudentScheduleEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduleMapper {

    private final ObjectMapper objectMapper;

    public ScheduleInterval toDomain(StudentScheduleEntity entity) {
        if (entity == null || entity.getScheduleData() == null || entity.getScheduleData().isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(entity.getScheduleData(), ScheduleInterval.class);
        } catch (Exception e) {
            log.error("Error al deserializar horario: {}", e.getMessage());
            return null;
        }
    }

    public StudentScheduleEntity toEntity(String studentId, ScheduleInterval schedule) {
        if (schedule == null) return null;
        String periodName = schedule.getPeriodName() != null ? schedule.getPeriodName() : "2026 - Ciclo 2 Agosto";
        String jsonPayload = null;
        try {
            jsonPayload = objectMapper.writeValueAsString(schedule);
        } catch (Exception e) {
            log.error("Error al serializar horario: {}", e.getMessage());
        }

        return StudentScheduleEntity.builder()
                .studentCode(studentId)
                .periodName(periodName)
                .weekNumber(schedule.getWeekNumber())
                .totalWeeks(schedule.getTotalWeeks())
                .scheduleData(jsonPayload)
                .lastSyncedDate(LocalDate.now())
                .build();
    }
}

