package com.utp.horario.infrastructure.repositories;

import com.utp.horario.infrastructure.entities.ScheduleSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Repositorio JPA del calendario plano de clases ({@code schedule_sessions},
 * Fase de Normalización).
 *
 * <p>La FK redundante {@code schedule_id} permite leer el calendario completo de
 * un horario con una sola consulta indexada (sin atravesar la jerarquía
 * horario → cursos → sesiones, e incluyendo filas huérfanas con
 * {@code course_id} NULL), y da soporte al borrado masivo del snapshot anterior
 * durante un re-sync.</p>
 */
@Repository
public interface ScheduleSessionJpaRepository extends JpaRepository<ScheduleSessionEntity, String> {

    /** Calendario plano (sesiones matched + huérfanas) de un horario, por su id. */
    List<ScheduleSessionEntity> findAllByScheduleId(String scheduleId);

    /**
     * Limpieza atómica del calendario de un horario: DELETE masivo por la FK
     * redundante en una sola sentencia (sesiones matched y huérfanas del snapshot
     * anterior), usada en re-sync y borrado del horario.
     */
    @Modifying
    @Query("DELETE FROM ScheduleSessionEntity se WHERE se.scheduleId = :scheduleId")
    @Transactional
    void deleteByScheduleId(@Param("scheduleId") String scheduleId);
}
