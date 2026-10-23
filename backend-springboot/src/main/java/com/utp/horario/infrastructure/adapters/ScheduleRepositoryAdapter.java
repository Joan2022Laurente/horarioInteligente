package com.utp.horario.infrastructure.adapters;

import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import com.utp.horario.infrastructure.entities.ScheduleSessionEntity;
import com.utp.horario.infrastructure.entities.StudentScheduleEntity;
import com.utp.horario.infrastructure.mappers.ScheduleMapper;
import com.utp.horario.infrastructure.repositories.JPAScheduleRepository;
import com.utp.horario.infrastructure.repositories.ScheduleSessionJpaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Adaptador de persistencia para horarios bajo la Fase de Normalización.
 *
 * <p>El guardado es un REPLAZO POR INSTANTÁNEA sobre la misma fila raíz: el
 * calendario plano del snapshot anterior se borra masivamente por la FK
 * redundante {@code schedule_id}, el catálogo anterior se elimina vía
 * {@code orphanRemoval} (sus sesiones ya no existen) y el grafo nuevo se inserta
 * en cascada. La reconstrucción de lectura evita el N+1: catálogo con
 * {@code JOIN FETCH} + calendario plano con una consulta indexada extra.</p>
 *
 * <p>Cada escritura se delimita en UNA transacción por {@link ScheduleSnapshotTransaction}
 * (auditoría de cierre 0.9): el fallo intermedio ejecuta rollback completo y no
 * deja cursos ni sesiones huérfanas; el catch preserva el plan B de degradación
 * elegante porque la transacción vive y muere dentro de esa frontera.</p>
 */
@Slf4j
@Repository
public class ScheduleRepositoryAdapter implements IScheduleRepository {

    private static final String DEFAULT_PERIOD = "2026 - Ciclo 2 Agosto";

    private final JPAScheduleRepository jpa;
    private final ScheduleSessionJpaRepository sessionJpa;
    private final ScheduleMapper mapper;
    private final ScheduleSnapshotTransaction snapshotTx;
    private final ConcurrentHashMap<String, ScheduleInterval> l1Cache = new ConcurrentHashMap<>();

    public ScheduleRepositoryAdapter(JPAScheduleRepository jpa,
                                     ScheduleSessionJpaRepository sessionJpa,
                                     ScheduleMapper mapper,
                                     ScheduleSnapshotTransaction snapshotTx) {
        this.jpa = jpa;
        this.sessionJpa = sessionJpa;
        this.mapper = mapper;
        this.snapshotTx = snapshotTx;
    }

    @Override
    public ScheduleInterval save(String studentId, ScheduleInterval schedule) {
        String periodName = schedule.getPeriodName() != null ? schedule.getPeriodName() : DEFAULT_PERIOD;
        String key = studentId + ":" + periodName;
        l1Cache.put(key, schedule);

        try {
            StudentScheduleEntity fresh = mapper.toEntity(studentId, schedule);
            List<ScheduleSessionEntity> orphanRows = mapper.toOrphanSessionRows(fresh, schedule);
            Optional<StudentScheduleEntity> existing =
                    jpa.findByStudentCodeAndPeriodNameWithCourses(studentId, periodName);

            if (existing.isPresent()) {
                snapshotTx.replaceSnapshot(existing.get(), fresh, orphanRows);
            } else {
                snapshotTx.insertSnapshot(fresh, orphanRows);
            }
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

    /**
     * Caché persistida vigente: valida la marca {@code lastSyncedDate} de la fila
     * raíz en base de datos. Contrasta con la lectura habitual: la cache L1 en
     * memoria NO participa aquí porque no porta la marca de sincronización y
     * podría servir un snapshot vencido como fresco.
     */
    @Override
    public Optional<ScheduleInterval> findByStudentIdAndPeriodSyncedSince(String studentId, String period, LocalDate minSyncDate) {
        String periodName = period != null ? period : DEFAULT_PERIOD;
        try {
            Optional<ScheduleInterval> fresh = jpa.findByStudentCodeAndPeriodNameWithCourses(studentId, periodName)
                    .filter(root -> root.getLastSyncedDate() != null
                            && !root.getLastSyncedDate().isBefore(minSyncDate))
                    .map(root -> mapper.toDomain(root, sessionJpa.findAllByScheduleId(root.getId())));
            fresh.ifPresent(interval -> l1Cache.put(studentId + ":" + periodName, interval));
            return fresh;
        } catch (Exception e) {
            log.warn("Error validando frescura del horario en base de datos para [{}]: {}", studentId, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<ScheduleInterval> findByStudentIdAndPeriod(String studentId, String period) {
        String periodName = period != null ? period : DEFAULT_PERIOD;
        String key = studentId + ":" + periodName;

        ScheduleInterval cached = l1Cache.get(key);
        if (cached != null) {
            return Optional.of(cached);
        }

        try {
            Optional<StudentScheduleEntity> entityOpt =
                    jpa.findByStudentCodeAndPeriodNameWithCourses(studentId, periodName);
            if (entityOpt.isPresent()) {
                StudentScheduleEntity root = entityOpt.get();
                ScheduleInterval interval = mapper.toDomain(root, sessionJpa.findAllByScheduleId(root.getId()));
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
        return jpa.findWithCoursesById(id)
                .map(root -> mapper.toDomain(root, sessionJpa.findAllByScheduleId(root.getId())));
    }

    @Override
    public ScheduleInterval update(ScheduleInterval scheduleInterval) {
        return save(scheduleInterval);
    }

    @Override
    public List<ScheduleInterval> list() {
        List<StudentScheduleEntity> roots = jpa.findAllWithCourses();
        if (roots.isEmpty()) return List.of();

        // Un solo round-trip extra para TODO el calendario (sin N+1 por horario).
        Map<String, List<ScheduleSessionEntity>> sessionsBySchedule = sessionJpa.findAll().stream()
                .filter(session -> session.getScheduleId() != null)
                .collect(Collectors.groupingBy(ScheduleSessionEntity::getScheduleId));

        return roots.stream()
                .map(root -> mapper.toDomain(root, sessionsBySchedule.getOrDefault(root.getId(), List.of())))
                .toList();
    }

    /**
     * Eliminación atómica: calendario + raíz en UNA transacción; un fallo intermedio
     * deja el horario íntegro en vez de una raíz sin calendario.
     */
    @Override
    public Boolean delete(String id) {
        if (jpa.existsById(id)) {
            snapshotTx.deleteSnapshotById(id);
            return true;
        }
        return false;
    }
}
