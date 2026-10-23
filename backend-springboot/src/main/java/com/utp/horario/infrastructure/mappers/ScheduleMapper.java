package com.utp.horario.infrastructure.mappers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.value_objects.ClassSession;
import com.utp.horario.domain.model.value_objects.Course;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import com.utp.horario.infrastructure.entities.ScheduleCourseEntity;
import com.utp.horario.infrastructure.entities.ScheduleSessionEntity;
import com.utp.horario.infrastructure.entities.StudentScheduleEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Mapper bidireccional entre el Value Object {@link ScheduleInterval} del dominio
 * (Java puro, sin JPA) y el grafo relacional de la Fase de Normalización:
 * raíz {@link StudentScheduleEntity} → catálogo {@link ScheduleCourseEntity} →
 * calendario plano {@link ScheduleSessionEntity}.
 *
 * <p>Notas de diseño (Fase de Normalización):</p>
 * <ul>
 *   <li>Los ids de fila reutilizan el id del Value Object cuando cabe en
 *       {@code VARCHAR(36)}; en caso contrario (o si viene nulo) se genera un UUID.
 *       Cada guardado es una instantánea: el reemplazo descarta y re-inserta filas.</li>
 *   <li>El emparejamiento sesión ↔ curso sigue las reglas de la pasarela:
 *       {@code session.courseCode == course.code} o, en su defecto,
 *       {@code session.courseName == course.name} (la denominación limpia coincide
 *       siempre en datos vivos). Las sesiones sin curso quedan huérfanas
 *       ({@code course_id} NULL) con sus campos denormalizados intactos, de modo
 *       que el Value Object conserva la paridad exacta.</li>
 *   <li>Las sesiones anidadas {@code Course.sessions} no tienen consumidores en
 *       la aplicación (el calendario plano es la fuente primaria por evento) y no
 *       se reconstruyen al leer: el catálogo guarda columnas atómicas.</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduleMapper {

    private final ObjectMapper objectMapper;

    /**
     * Convierte un horario de dominio en el grafo relacional completo. Cada guardado
     * es una INSTANTÁNEA: el adaptador reemplaza el grafo anterior vía
     * {@code orphanRemoval} y limpia el blob legacy {@code schedule_data}.
     */
    public StudentScheduleEntity toEntity(String studentId, ScheduleInterval schedule) {
        if (schedule == null) return null;
        String periodName = schedule.getPeriodName() != null ? schedule.getPeriodName() : "2026 - Ciclo 2 Agosto";

        StudentScheduleEntity root = StudentScheduleEntity.builder()
                .studentCode(studentId)
                .periodName(periodName)
                .weekNumber(schedule.getWeekNumber())
                .totalWeeks(schedule.getTotalWeeks())
                .startDate(schedule.getStartDate())
                .endDate(schedule.getEndDate())
                .lastSyncedDate(LocalDate.now())
                .scheduleData(null)
                .courses(new java.util.LinkedHashSet<>())
                .build();

        if (schedule.getCourses() != null) {
            for (Course course : schedule.getCourses()) {
                root.getCourses().add(toCourseEntity(root, course));
            }
        }
        if (schedule.getClasses() != null) {
            for (ClassSession session : schedule.getClasses()) {
                ScheduleCourseEntity owner = findOwner(session, root.getCourses());
                if (owner != null) {
                    ScheduleSessionEntity row = toSessionEntity(root, session);
                    row.setCourse(owner);
                    owner.getSessions().add(row);
                }
                // Sin curso coincidente: la fila huérfana se expone vía toOrphanSessionRows.
            }
        }
        return root;
    }

    /**
     * Filas de calendario sin curso asociado ({@code course_id} NULL). La FK
     * redundante {@code schedule_id} las deja alcanzables por el repositorio de
     * sesiones, de modo que ninguna clase entregada por la pasarela se pierde.
     */
    public List<ScheduleSessionEntity> toOrphanSessionRows(StudentScheduleEntity root, ScheduleInterval schedule) {
        List<ScheduleSessionEntity> orphans = new ArrayList<>();
        if (schedule == null || schedule.getClasses() == null || root == null) return orphans;
        for (ClassSession session : schedule.getClasses()) {
            if (findOwner(session, root.getCourses()) == null) {
                orphans.add(toSessionEntity(root, session));
            }
        }
        return orphans;
    }

    /** Reancla las FKs de una instantánea nueva hacia la raíz gestionada (usado en update). */
    public void rebindSchedule(StudentScheduleEntity target, StudentScheduleEntity fresh,
                               List<ScheduleSessionEntity> orphanRows) {
        if (fresh.getCourses() != null) {
            for (ScheduleCourseEntity course : fresh.getCourses()) {
                course.setSchedule(target);
                if (course.getSessions() != null) {
                    for (ScheduleSessionEntity session : course.getSessions()) {
                        session.setSchedule(target);
                    }
                }
            }
        }
        if (orphanRows != null) {
            for (ScheduleSessionEntity session : orphanRows) {
                session.setSchedule(target);
            }
        }
    }

    /**
     * Reconstruye el Value Object de dominio desde el grafo relacional.
     *
     * <p>Estrategia de transición segura: si las colecciones relacionales están
     * vacías y la fila conserva el blob legacy {@code schedule_data}, se deserializa
     * el JSON antiguo (filas aún no resincronizadas).</p>
     */
    public ScheduleInterval toDomain(StudentScheduleEntity entity, List<ScheduleSessionEntity> sessionRows) {
        if (entity == null) return null;

        List<Course> courses = new ArrayList<>();
        if (entity.getCourses() != null) {
            for (ScheduleCourseEntity row : entity.getCourses()) {
                courses.add(toCourseDomain(row));
            }
        }
        List<ClassSession> classes = new ArrayList<>();
        if (sessionRows != null) {
            for (ScheduleSessionEntity row : sessionRows) {
                classes.add(toSessionDomain(row));
            }
        }

        if (courses.isEmpty() && classes.isEmpty()
                && entity.getScheduleData() != null && !entity.getScheduleData().isBlank()) {
            try {
                return objectMapper.readValue(entity.getScheduleData(), ScheduleInterval.class);
            } catch (Exception e) {
                log.warn("Fallback legacy fallido para horario [{}] periodo [{}]: {}",
                        entity.getStudentCode(), entity.getPeriodName(), e.getMessage());
            }
        }

        return ScheduleInterval.builder()
                .id(entity.getId())
                .periodName(entity.getPeriodName())
                .weekNumber(entity.getWeekNumber())
                .totalWeeks(entity.getTotalWeeks())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .courses(courses)
                .classes(classes)
                .build();
    }

    // ── Escritura: dominio → entidades ──

    private ScheduleCourseEntity toCourseEntity(StudentScheduleEntity root, Course course) {
        ScheduleCourseEntity row = ScheduleCourseEntity.builder()
                .id(rowId(course.getId()))
                .courseCode(truncateSafely(course.getCode(), 128))
                .courseName(truncateSafely(course.getName() != null ? course.getName()
                        : (course.getCode() != null ? course.getCode() : ""), 255))
                .section(truncateSafely(course.getSection(), 64))
                .credits(course.getCredits())
                .teacher(truncateSafely(course.getTeacher(), 255))
                .modality(truncateSafely(course.getModality(), 32))
                .weeklyHours(course.getWeeklyHours())
                .build();
        row.setSchedule(root);
        return row;
    }

    private ScheduleSessionEntity toSessionEntity(StudentScheduleEntity root, ClassSession session) {
        ScheduleSessionEntity row = ScheduleSessionEntity.builder()
                .id(rowId(session.getId()))
                .courseCode(truncateSafely(session.getCourseCode(), 128))
                .courseName(truncateSafely(session.getCourseName(), 255))
                .section(truncateSafely(session.getSection(), 64))
                .classroom(truncateSafely(session.getClassroom(), 128))
                .building(truncateSafely(session.getBuilding(), 128))
                .floor(truncateSafely(session.getFloor(), 32))
                .teacher(truncateSafely(session.getTeacher(), 255))
                .modality(truncateSafely(session.getModality(), 16))
                .startAt(session.getStartAt())
                .finishAt(session.getFinishAt())
                .zoomLink(session.getZoomLink())
                .environmentType(truncateSafely(session.getEnvironmentType(), 128))
                .classLink(session.getClassLink())
                .sectionId(truncateSafely(session.getSectionId(), 128))
                .build();
        row.setSchedule(root);
        return row;
    }

    // ── Lectura: entidades → dominio ──

    private Course toCourseDomain(ScheduleCourseEntity row) {
        return Course.builder()
                .id(row.getId())
                .code(row.getCourseCode())
                .name(row.getCourseName())
                .section(row.getSection())
                .credits(row.getCredits())
                .teacher(row.getTeacher())
                .modality(row.getModality())
                .weeklyHours(row.getWeeklyHours())
                .build();
    }

    private ClassSession toSessionDomain(ScheduleSessionEntity row) {
        return ClassSession.builder()
                .id(row.getId())
                .courseCode(row.getCourseCode())
                .courseName(row.getCourseName())
                .section(row.getSection())
                .classroom(row.getClassroom())
                .building(row.getBuilding())
                .teacher(row.getTeacher())
                .modality(row.getModality())
                .startAt(row.getStartAt())
                .finishAt(row.getFinishAt())
                .zoomLink(row.getZoomLink())
                .floor(row.getFloor())
                .environmentType(row.getEnvironmentType())
                .classLink(row.getClassLink())
                .sectionId(row.getSectionId())
                .build();
    }

    // ── Reglas de emparejamiento (reflejan la construcción de la pasarela) ──

    private ScheduleCourseEntity findOwner(ClassSession session, Iterable<ScheduleCourseEntity> catalog) {
        if (catalog == null) return null;
        for (ScheduleCourseEntity course : catalog) {
            if (codeMatches(session, course) || nameMatches(session, course)) {
                return course;
            }
        }
        return null;
    }

    private boolean codeMatches(ClassSession session, ScheduleCourseEntity course) {
        return session.getCourseCode() != null && course.getCourseCode() != null
                && session.getCourseCode().trim().equalsIgnoreCase(course.getCourseCode().trim());
    }

    private boolean nameMatches(ClassSession session, ScheduleCourseEntity course) {
        return session.getCourseName() != null && course.getCourseName() != null
                && session.getCourseName().trim().equalsIgnoreCase(course.getCourseName().trim());
    }

    private String rowId(String candidate) {
        return candidate != null && !candidate.isBlank() && candidate.trim().length() <= 36
                ? candidate.trim()
                : UUID.randomUUID().toString();
    }

    /**
     * Politica Zero-Crash (Fase 1.1): sanitiza todo string antes de asignarlo a una
     * columna acotada. Recorta espacios y, si el valor excede la cota de la columna
     * (cotas holgadas tras la ampliación a 128), lo trunca en el límite. Con esto la
     * transacción relacional de MySQL jamás falla por {@code Data truncation}, ante
     * cualquier emisión anómala futura de la pasarela institucional. Los links
     * (zoom/class) persisten en columnas TEXT y no requieren truncado.
     */
    static String truncateSafely(String value, int maxLength) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }
}
