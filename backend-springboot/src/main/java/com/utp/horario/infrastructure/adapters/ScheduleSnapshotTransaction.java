package com.utp.horario.infrastructure.adapters;

import com.utp.horario.infrastructure.entities.ScheduleSessionEntity;
import com.utp.horario.infrastructure.entities.StudentScheduleEntity;
import com.utp.horario.infrastructure.mappers.ScheduleMapper;
import com.utp.horario.infrastructure.repositories.JPAScheduleRepository;
import com.utp.horario.infrastructure.repositories.ScheduleSessionJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Frontera transaccional de la escritura de snapshots (auditoría de cierre 0.9).
 *
 * <p>Agrupa en UNA transacción el borrado masivo del calendario y la persistencia
 * en cascada del grafo nuevo. Así se elimina la ventana de estado parcial que
 * existía cuando cada llamada al repositorio cometía su propia transacción:
 * sesiones borradas con catálogo viejo intacto, catálogo nuevo sin sesiones o
 * raíz eliminada en {@code delete} con calendario residual.</p>
 *
 * <p><b>Semántica de degradación elegante intacta:</b> la transacción vive y muere
 * dentro de esta frontera. Si algo falla, la excepción atraviesa SOLO el proxy de
 * este bean (rollback completo aquí), jamás una transacción exterior a la que
 * contaminar con {@code rollback-only}; el adaptador la captura y el caso de uso
 * continúa con el plan B sin {@code UnexpectedRollbackException}.</p>
 */
@Component
@RequiredArgsConstructor
public class ScheduleSnapshotTransaction {

    private final JPAScheduleRepository jpa;
    private final ScheduleSessionJpaRepository sessionJpa;
    private final ScheduleMapper mapper;

    /**
     * Sustitución atómica del snapshot conservando la fila raíz: el borrado masivo
     * del calendario ({@code deleteByScheduleId}) se ejecuta como SQL declarativo
     * primero, antes de tocar colecciones, de modo que el flush del {@code orphanRemoval}
     * nunca choca contra FK de sesiones todavía presentes.
     */
    @Transactional(readOnly = false)
    public void replaceSnapshot(StudentScheduleEntity stale,
                                StudentScheduleEntity fresh,
                                List<ScheduleSessionEntity> orphanRows) {
        // 1) Calendario del snapshot anterior fuera (sesiones matched + huérfanas).
        sessionJpa.deleteByScheduleId(stale.getId());

        // 2) Reanclaje de las filas nuevas a la raíz gestionada y copia de columnas.
        mapper.rebindSchedule(stale, fresh, orphanRows);
        stale.setWeekNumber(fresh.getWeekNumber());
        stale.setTotalWeeks(fresh.getTotalWeeks());
        stale.setStartDate(fresh.getStartDate());
        stale.setEndDate(fresh.getEndDate());
        stale.setLastSyncedDate(LocalDate.now());
        // El contenido antiguo vive ya en tablas relacionales; escrituras limpian el blob.
        stale.setScheduleData(null);
        stale.getCourses().clear();
        stale.getCourses().addAll(fresh.getCourses());

        // 3) Persistencia en cascada: inserta catálogo nuevo + sesiones matched;
        //    orphanRemoval borra el catálogo del snapshot anterior.
        jpa.save(stale);

        // 4) Sesiones huérfanas del snapshot nuevo (course_id NULL, salvadas por schedule_id).
        if (!orphanRows.isEmpty()) sessionJpa.saveAll(orphanRows);
    }

    /**
     * Inserción atómica del primer snapshot (raíz + sesiones huérfanas).
     */
    @Transactional(readOnly = false)
    public void insertSnapshot(StudentScheduleEntity fresh, List<ScheduleSessionEntity> orphanRows) {
        jpa.save(fresh);
        if (!orphanRows.isEmpty()) sessionJpa.saveAll(orphanRows);
    }

    /**
     * Eliminación atómica del horario completo (calendario + raíz).
     */
    @Transactional(readOnly = false)
    public void deleteSnapshotById(String id) {
        sessionJpa.deleteByScheduleId(id);
        jpa.deleteById(id);
    }
}
