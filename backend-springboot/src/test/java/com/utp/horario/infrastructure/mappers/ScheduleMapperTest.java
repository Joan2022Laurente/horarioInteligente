package com.utp.horario.infrastructure.mappers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.value_objects.ClassSession;
import com.utp.horario.domain.model.value_objects.Course;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import com.utp.horario.infrastructure.entities.ScheduleCourseEntity;
import com.utp.horario.infrastructure.entities.ScheduleSessionEntity;
import com.utp.horario.infrastructure.entities.StudentScheduleEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Paridad exacta (Fase de Normalización) entre el Value Object
 * {@link ScheduleInterval} del dominio (Java puro) y el grafo relacional de
 * entidades: raíz → catálogo de cursos → calendario plano de sesiones.
 */
class ScheduleMapperTest {

    private ScheduleMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new ScheduleMapper(new ObjectMapper().findAndRegisterModules());
    }

    // ── Datos de la pasarela (shape real observado) ──

    private Course course() {
        return Course.builder()
                .id("c-desarrollo-web-integrado")
                .code("SI65")
                .name("DESARROLLO WEB INTEGRADO")
                .section("NRC12345")
                .credits(3)
                .teacher("PEREZ RAMIREZ, DAVID")
                .modality("P")
                .weeklyHours(6)
                .build();
    }

    /** Sesión emparejable por código (session.courseCode == course.code). */
    private ClassSession classByCode() {
        return ClassSession.builder()
                .id("ev-1")
                .courseCode("SI65")
                .courseName("DESARROLLO WEB INTEGRADO")
                .section("NRC12345")
                .classroom("211A")
                .building("Edificio 2")
                .floor("2")
                .teacher("PEREZ RAMIREZ, DAVID")
                .modality("P")
                .startAt(LocalDateTime.of(2026, 10, 5, 7, 0))
                .finishAt(LocalDateTime.of(2026, 10, 5, 10, 0))
                .zoomLink(null)
                .environmentType("Aula")
                .classLink("https://utp.puo.edu/section/abc-123")
                .sectionId("abc-123")
                .build();
    }

    /** El código no casará con el catálogo, pero el nombre limpio sí (regla de la pasarela). */
    private ClassSession classNameOnly() {
        return ClassSession.builder()
                .id("ev-2")
                .courseCode("100000SI65-seccion-uuid")
                .courseName("DESARROLLO WEB INTEGRADO")
                .section("NRC12345")
                .classroom("Lab 3")
                .building("Edificio 2")
                .floor("1")
                .teacher("PEREZ RAMIREZ, DAVID")
                .modality("R")
                .startAt(LocalDateTime.of(2026, 10, 6, 7, 0))
                .finishAt(LocalDateTime.of(2026, 10, 6, 9, 0))
                .zoomLink("https://zoom.us/j/utp-demo")
                .environmentType("Virtual")
                .classLink(null)
                .sectionId(null)
                .build();
    }

    /** Sin coincidencia de código ni nombre: fila huérfana (course_id NULL). */
    private ClassSession classOrphan() {
        return ClassSession.builder()
                .id("ev-3")
                .courseCode("EVENTO-EXTRA")
                .courseName("CHARLA INSTITUCIONAL")
                .section("NRC00000")
                .classroom("Auditorio")
                .building("Campus Lima Centro")
                .floor(null)
                .teacher("Dirección de Carrera")
                .modality("P")
                .startAt(LocalDateTime.of(2026, 10, 7, 12, 30))
                .finishAt(LocalDateTime.of(2026, 10, 7, 14, 0))
                .build();
    }

    private ScheduleInterval interval() {
        return ScheduleInterval.builder()
                .id("sched-demo-01")
                .periodName("2026 - Ciclo 2 Agosto")
                .weekNumber(7)
                .totalWeeks(18)
                .startDate(LocalDate.of(2026, 8, 17))
                .endDate(LocalDate.of(2026, 12, 18))
                .courses(List.of(course()))
                .classes(List.of(classByCode(), classNameOnly(), classOrphan()))
                .build();
    }

    @Test
    @DisplayName("toEntity construye el grafo relacional con FKs y vínculos bidireccionales")
    void toEntityConstruyeGrafoConVinculosBidireccionales() {
        StudentScheduleEntity root = mapper.toEntity("U23307609", interval());

        assertEquals("U23307609", root.getStudentCode());
        assertEquals("2026 - Ciclo 2 Agosto", root.getPeriodName());
        assertEquals(7, root.getWeekNumber());
        assertEquals(18, root.getTotalWeeks());
        assertEquals(LocalDate.of(2026, 8, 17), root.getStartDate());
        assertEquals(LocalDate.of(2026, 12, 18), root.getEndDate());
        // Escrituras nuevas limpian el blob legacy (el contenido vive ya relacional).
        assertNull(root.getScheduleData());

        assertEquals(1, root.getCourses().size());
        ScheduleCourseEntity courseRow = root.getCourses().iterator().next();
        assertSame(root, courseRow.getSchedule());
        assertEquals("SI65", courseRow.getCourseCode());
        assertEquals("DESARROLLO WEB INTEGRADO", courseRow.getCourseName());
        assertEquals("NRC12345", courseRow.getSection());
        assertEquals(3, courseRow.getCredits());
        assertEquals("PEREZ RAMIREZ, DAVID", courseRow.getTeacher());
        assertEquals("P", courseRow.getModality());
        assertEquals(6, courseRow.getWeeklyHours());

        // Sesiones emparejadas (ev-1 y ev-2) colgadas del curso con ambas FKs.
        assertEquals(2, courseRow.getSessions().size());
        for (ScheduleSessionEntity session : courseRow.getSessions()) {
            assertSame(root, session.getSchedule());
            assertSame(courseRow, session.getCourse());
        }

        // La huérfana (ev-3) queda fuera del catálogo, no sesiones del curso.
        List<ScheduleSessionEntity> orphans = mapper.toOrphanSessionRows(root, interval());
        assertEquals(1, orphans.size());
        assertNull(orphans.get(0).getCourse());
        assertSame(root, orphans.get(0).getSchedule());
        assertEquals("CHARLA INSTITUCIONAL", orphans.get(0).getCourseName());
    }

    @Test
    @DisplayName("toDomain reconstruye el Value Object con paridad exacta")
    void toDomainReconstruyeConParidadExacta() {
        ScheduleInterval original = interval();
        StudentScheduleEntity root = mapper.toEntity("U23307609", original);

        List<ScheduleSessionEntity> sessionRows = new ArrayList<>();
        // Orden determinista: sesiones del catálogo en orden de inserción + huérfanas al final.
        for (ScheduleCourseEntity courseRow : root.getCourses()) {
            sessionRows.addAll(courseRow.getSessions());
        }
        sessionRows.addAll(mapper.toOrphanSessionRows(root, original));

        ScheduleInterval rebuilt = mapper.toDomain(root, sessionRows);

        assertEquals(original.getPeriodName(), rebuilt.getPeriodName());
        assertEquals(original.getWeekNumber(), rebuilt.getWeekNumber());
        assertEquals(original.getTotalWeeks(), rebuilt.getTotalWeeks());
        assertEquals(original.getStartDate(), rebuilt.getStartDate());
        assertEquals(original.getEndDate(), rebuilt.getEndDate());

        // Catálogo: paridad campo a campo (sessions anidadas no reconstruidas por diseño:
        // el calendario plano es la fuente primaria y Course.getSessions no tiene consumidores).
        assertEquals(1, rebuilt.getCourses().size());
        Course rebuiltCourse = rebuilt.getCourses().get(0);
        Course originalCourse = original.getCourses().get(0);
        assertEquals(originalCourse.getId(), rebuiltCourse.getId());
        assertEquals(originalCourse.getCode(), rebuiltCourse.getCode());
        assertEquals(originalCourse.getName(), rebuiltCourse.getName());
        assertEquals(originalCourse.getSection(), rebuiltCourse.getSection());
        assertEquals(originalCourse.getCredits(), rebuiltCourse.getCredits());
        assertEquals(originalCourse.getTeacher(), rebuiltCourse.getTeacher());
        assertEquals(originalCourse.getModality(), rebuiltCourse.getModality());
        assertEquals(originalCourse.getWeeklyHours(), rebuiltCourse.getWeeklyHours());

        // Calendario plano: paridad completa incluidas las denormalizaciones.
        assertEquals(3, rebuilt.getClasses().size());
        for (int i = 0; i < original.getClasses().size(); i++) {
            ClassSession originalSession = original.getClasses().get(i);
            ClassSession rebuiltSession = rebuilt.getClasses().get(i);
            assertEquals(originalSession.getId(), rebuiltSession.getId());
            assertEquals(originalSession.getCourseCode(), rebuiltSession.getCourseCode());
            assertEquals(originalSession.getCourseName(), rebuiltSession.getCourseName());
            assertEquals(originalSession.getSection(), rebuiltSession.getSection());
            assertEquals(originalSession.getClassroom(), rebuiltSession.getClassroom());
            assertEquals(originalSession.getBuilding(), rebuiltSession.getBuilding());
            assertEquals(originalSession.getFloor(), rebuiltSession.getFloor());
            assertEquals(originalSession.getTeacher(), rebuiltSession.getTeacher());
            assertEquals(originalSession.getModality(), rebuiltSession.getModality());
            assertEquals(originalSession.getStartAt(), rebuiltSession.getStartAt());
            assertEquals(originalSession.getFinishAt(), rebuiltSession.getFinishAt());
            assertEquals(originalSession.getZoomLink(), rebuiltSession.getZoomLink());
            assertEquals(originalSession.getEnvironmentType(), rebuiltSession.getEnvironmentType());
            assertEquals(originalSession.getClassLink(), rebuiltSession.getClassLink());
            assertEquals(originalSession.getSectionId(), rebuiltSession.getSectionId());
        }
    }

    @Test
    @DisplayName("El blob legacy solo se usa si las colecciones relacionales están vacías")
    void fallbackLegacySoloSiRelacionalVacio() {
        // 1) Fila legacy sin contenido relacional: se recupera del blob JSON.
        StudentScheduleEntity legacy = StudentScheduleEntity.builder()
                .id("sched-legacy")
                .studentCode("U23307609")
                .periodName("2026 - Ciclo 2 Agosto")
                .weekNumber(6)
                .totalWeeks(18)
                .lastSyncedDate(LocalDate.of(2026, 10, 3))
                .scheduleData("{\"periodName\":\"2026 - Ciclo 2 Agosto\",\"weekNumber\":6,\"totalWeeks\":18,"
                        + "\"courses\":[],\"classes\":[]}")
                .courses(new java.util.LinkedHashSet<>())
                .build();

        ScheduleInterval fromLegacy = mapper.toDomain(legacy, List.of());
        assertEquals(6, fromLegacy.getWeekNumber());
        assertTrue(fromLegacy.getCourses().isEmpty());
        assertTrue(fromLegacy.getClasses().isEmpty());

        // 2) Contenido relacional presente: el blob (aunque corrupto) se ignora.
        StudentScheduleEntity current = mapper.toEntity("U23307609", interval());
        current.setScheduleData("{json-corrupto");
        ScheduleInterval fromRelational = mapper.toDomain(current, List.of());
        assertEquals(1, fromRelational.getCourses().size());
        assertTrue(fromRelational.getClasses().isEmpty());
    }

    @Test
    @DisplayName("rebindSchedule reancla las FKs del snapshot nuevo hacia la raíz gestionada")
    void rebindScheduleReanclaFks() {
        StudentScheduleEntity fresh = mapper.toEntity("U23307609", interval());
        List<ScheduleSessionEntity> orphans = mapper.toOrphanSessionRows(fresh, interval());
        StudentScheduleEntity target = StudentScheduleEntity.builder()
                .id("sched-existente")
                .studentCode("U23307609")
                .periodName("2026 - Ciclo 2 Agosto")
                .lastSyncedDate(LocalDate.now())
                .build();

        mapper.rebindSchedule(target, fresh, orphans);

        for (ScheduleCourseEntity courseRow : fresh.getCourses()) {
            assertSame(target, courseRow.getSchedule());
            for (ScheduleSessionEntity session : courseRow.getSessions()) {
                assertSame(target, session.getSchedule());
            }
        }
        for (ScheduleSessionEntity orphan : orphans) {
            assertSame(target, orphan.getSchedule());
        }
    }
}
