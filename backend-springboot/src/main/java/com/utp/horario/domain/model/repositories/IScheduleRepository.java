package com.utp.horario.domain.model.repositories;

import com.utp.horario.domain.model.value_objects.ScheduleInterval;

import java.time.LocalDate;
import java.util.Optional;

public interface IScheduleRepository extends ICRUD<ScheduleInterval, String> {
    ScheduleInterval save(String studentId, ScheduleInterval schedule);
    Optional<ScheduleInterval> findByStudentIdAndPeriod(String studentId, String period);

    /**
     * Snapshot del horario cuya sincronización oficial es de fecha o posterior a
     * {@code minSyncDate} (caché persistida vigente en MySQL). Lectura pura del
     * Read Model: nunca consulta la pasarela externa.
     */
    Optional<ScheduleInterval> findByStudentIdAndPeriodSyncedSince(String studentId, String period, LocalDate minSyncDate);
}
