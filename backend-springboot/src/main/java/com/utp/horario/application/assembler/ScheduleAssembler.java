package com.utp.horario.application.assembler;

import com.utp.horario.application.dtos.ScheduleDto;
import com.utp.horario.domain.model.value_objets.ScheduleInterval;
import org.springframework.stereotype.Component;

@Component
public class ScheduleAssembler {

    public ScheduleDto toDto(ScheduleInterval interval) {
        if (interval == null) return null;
        return ScheduleDto.builder()
                .id(interval.getId())
                .periodName(interval.getPeriodName())
                .weekNumber(interval.getWeekNumber())
                .totalWeeks(interval.getTotalWeeks())
                .startDate(interval.getStartDate())
                .endDate(interval.getEndDate())
                .courses(interval.getCourses())
                .classes(interval.getClasses())
                .build();
    }
}
