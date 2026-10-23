package com.utp.horario.application.service.tool;

import com.utp.horario.application.dtos.AcademicToolDto.EvaluationSummaryDto;
import com.utp.horario.application.dtos.AcademicToolDto.WeeklySessionDto;
import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.repositories.IStudentRepository;
import com.utp.horario.domain.model.repositories.ISyllabusRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.domain.model.value_objects.ClassSession;
import com.utp.horario.domain.model.value_objects.Course;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Alcance temporal de las herramientas academicas.
 *
 * <p>Verifica que el filtro por semana lectiva acota el cronograma en el servidor y que el
 * overload historico (sin semana) conserva el sílabo integro.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AcademicToolServiceWeeklyScopeTest {

    @Mock
    private IScheduleRepository scheduleRepository;

    @Mock
    private ISyllabusRepository syllabusRepository;

    @Mock
    private IStudentRepository studentRepository;

    @Mock
    private IUtpPortalGateway utpPortalGateway;

    @InjectMocks
    private AcademicToolService toolService;

    @Test
    @DisplayName("El filtro por semana acota el cronograma y las evaluaciones a esa semana")
    void weekFilterNarrowsScheduleAndEvaluations() {
        stubPersistedSyllabus();

        var result = toolService.getSyllabusDetails("U23307609", "DESARROLLO WEB INTEGRADO", 8);

        assertNotNull(result);
        assertEquals(1, result.weeklySchedule().size(), "Solo debe devolverse la semana solicitada");
        assertEquals(8, result.weeklySchedule().get(0).week());
        assertEquals(1, result.evaluations().size());
        assertEquals(8, result.evaluations().get(0).weekScheduled());
    }

    @Test
    @DisplayName("Sin filtro semanal se conserva el sílabo íntegro (comportamiento histórico)")
    void withoutWeekFilterFullSyllabusIsReturned() {
        stubPersistedSyllabus();

        var result = toolService.getSyllabusDetails("U23307609", "DESARROLLO WEB INTEGRADO");

        assertEquals(3, result.weeklySchedule().size());
        assertEquals(2, result.evaluations().size());
    }

    @Test
    @DisplayName("resolveCurrentWeek devuelve la semana vigente del horario persistido")
    void resolvesCurrentWeekFromPersistedSchedule() {
        ScheduleInterval interval = new ScheduleInterval();
        interval.setWeekNumber(8);
        interval.setPeriodName("2026 - Ciclo 2 Agosto");
        when(scheduleRepository.findByStudentIdAndPeriod(anyString(), anyString()))
                .thenReturn(Optional.of(interval));

        assertEquals(8, toolService.resolveCurrentWeek("U23307609"));
    }

    @Test
    @DisplayName("Sin horario persistido no se inventa una semana lectiva")
    void returnsNullWeekWhenScheduleIsAbsent() {
        when(scheduleRepository.findByStudentIdAndPeriod(anyString(), anyString()))
                .thenReturn(Optional.empty());

        assertEquals(null, toolService.resolveCurrentWeek("U23307609"));
    }

    private void stubPersistedSyllabus() {
        Course course = new Course();
        course.setCode("100000ST61");
        course.setName("DESARROLLO WEB INTEGRADO");

        ClassSession session = new ClassSession();
        session.setCourseCode("100000ST61");
        session.setCourseName("DESARROLLO WEB INTEGRADO");
        session.setStartAt(LocalDateTime.of(2026, 10, 20, 18, 30));
        session.setFinishAt(LocalDateTime.of(2026, 10, 20, 20, 10));

        ScheduleInterval interval = new ScheduleInterval();
        interval.setWeekNumber(8);
        interval.setPeriodName("2026 - Ciclo 2 Agosto");
        interval.setCourses(List.of(course));
        interval.setClasses(List.of(session));

        lenient().when(scheduleRepository.findByStudentIdAndPeriod(anyString(), anyString()))
                .thenReturn(Optional.of(interval));

        Syllabus syllabus = Syllabus.builder()
                .id("100000ST61")
                .courseCode("100000ST61")
                .courseName("DESARROLLO WEB INTEGRADO")
                .semester("2026 - Ciclo 2 Agosto")
                .credits(3)
                .modality("Presencial")
                .formula("(20%)APF1 + (20%)APF2 + (20%)APF3 + (40%)PROY")
                .evaluations(List.of(
                        com.utp.horario.domain.model.value_objects.SyllabusEvaluation.builder()
                                .id("APF2").type("APF2").description("AVANCE DE PROYECTO FINAL 2")
                                .week(8).weightPercent(20).modality("Individual").observation("").build(),
                        com.utp.horario.domain.model.value_objects.SyllabusEvaluation.builder()
                                .id("APF3").type("APF3").description("AVANCE DE PROYECTO FINAL 3")
                                .week(10).weightPercent(20).modality("Individual").observation("").build()))
                .weeklySchedule(List.of(
                        com.utp.horario.domain.model.value_objects.SyllabusWeeklySession.builder()
                                .week(1).session(1).unit("Unidad 1").topic("Fundamentos")
                                .activities("Clase").build(),
                        com.utp.horario.domain.model.value_objects.SyllabusWeeklySession.builder()
                                .week(8).session(1).unit("Unidad 2").topic("Persistencia y seguridad")
                                .activities("Laboratorio").evaluation("APF2").build(),
                        com.utp.horario.domain.model.value_objects.SyllabusWeeklySession.builder()
                                .week(10).session(1).unit("Unidad 3").topic("Despliegue")
                                .activities("Taller").evaluation("APF3").build()))
                .build();

        when(syllabusRepository.findByCourseCode("100000ST61")).thenReturn(Optional.of(syllabus));

        StudentProfile profile = new StudentProfile();
        profile.setStudentCode("U23307609");
        lenient().when(studentRepository.findByStudentCode(anyString())).thenReturn(Optional.of(profile));
    }
}
