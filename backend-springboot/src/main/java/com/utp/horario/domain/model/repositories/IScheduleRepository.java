package com.utp.horario.domain.model.repositories;

import com.utp.horario.domain.model.value_objets.ScheduleInterval;

import java.util.Optional;

public interface IScheduleRepository extends ICRUD<ScheduleInterval, String> {
    ScheduleInterval save(String studentId, ScheduleInterval schedule);
    Optional<ScheduleInterval> findByStudentIdAndPeriod(String studentId, String period);
}
