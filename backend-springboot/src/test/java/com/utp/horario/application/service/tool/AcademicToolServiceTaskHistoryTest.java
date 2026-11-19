package com.utp.horario.application.service.tool;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.service.TaskQueryService;
import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.repositories.IStudentRepository;
import com.utp.horario.domain.model.repositories.ISyllabusRepository;
import com.utp.horario.domain.model.repositories.ITaskSyncRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.domain.model.value_objects.ClassSession;
import com.utp.horario.domain.model.value_objects.Course;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import com.utp.horario.domain.model.value_objects.SyllabusEvaluation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regresiones del canal IA para el historial completo de tareas y la correlación
 * con rubros oficiales del sílabo (incidente "SERVICIOS CLOUD" / 100000SI97).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AcademicToolServiceTaskHistoryTest {

    private static final String STUDENT = "U23307609";
    private static final String COURSE_CODE = "100000SI97";
    private static final String COURSE_NAME = "SERVICIOS CLOUD";

    @Mock private IScheduleRepository scheduleRepository;
    @Mock private ISyllabusRepository syllabusRepository;
    @Mock private IStudentRepository studentRepository;
    @Mock private IUtpPortalGateway utpPortalGateway;
    @Mock private TaskQueryService taskQueryService;
    @Mock private ITaskSyncRepository taskRepository;

    private AcademicToolService toolService;

    @BeforeEach
    void setUp() {
        toolService = new AcademicToolService(scheduleRepository, syllabusRepository, studentRepository,
                utpPortalGateway, new ObjectMapper());
        ReflectionTestUtils.setField(toolService, "taskQueryService", taskQueryService);
        ReflectionTestUtils.setField(toolService, "taskRepository", taskRepository);

        Course course = Course.builder().code(COURSE_CODE).name(COURSE_NAME).build();
        ClassSession session = ClassSession.builder().courseCode(COURSE_CODE).courseName(COURSE_NAME).build();
        ScheduleInterval interval = ScheduleInterval.builder()
                .periodName("2026 - Ciclo 2 Agosto")
                .weekNumber(15)
                .courses(List.of(course))
                .classes(List.of(session))
                .build();
        when(scheduleRepository.findByStudentIdAndPeriod(anyString(), anyString()))
                .thenReturn(Optional.of(interval));
        when(syllabusRepository.findByCourseCode(COURSE_CODE)).thenReturn(Optional.of(syllabus()));
    }

    @Test
    @DisplayName("Recupera el historial completo del periodo y clasifica semanas pasadas")
    void retrievesFullPeriodHistoryAndClassifiesPastWeeks() {
        when(taskQueryService.getActivities(eq(STUDENT), any(), eq("period"), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(
                        task("t1", "Foro de la semana 3", 3, false),
                        task("t2", "Práctica de la semana 9", 9, true),
                        task("t3", "PARTICIPACIÓN EN CLASE", 15, false)));

        var result = toolService.getCourseTasksAndActivities(STUDENT, COURSE_NAME);

        assertNotNull(result);
        assertEquals(3, result.totalCourseTasks(), "Deben recuperarse las semanas 1-14 además de la 15");
        assertTrue(result.tasks().stream().anyMatch(t -> "PASADA_NO_ENTREGADA".equals(t.timingStatus())));
        assertTrue(result.tasks().stream().anyMatch(t -> "ENTREGADA_A_TIEMPO".equals(t.timingStatus())));
        verify(taskQueryService).getActivities(eq(STUDENT), any(), eq("period"), isNull(), isNull(), isNull(), isNull());
        verify(taskQueryService, never()).getTasksWithPortalFallback(anyString(), any());
    }

    @Test
    @DisplayName("Título sin correlación se asocia al rubro oficial PA del sílabo con su peso")
    void titleMatchesOfficialSyllabusRubroWithoutSyntheticFallback() {
        when(taskQueryService.getActivities(eq(STUDENT), any(), eq("period"), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(task("t3", "PARTICIPACIÓN EN CLASE", 15, false)));

        var result = toolService.getCourseTasksAndActivities(STUDENT, COURSE_NAME);

        assertEquals(1, result.tasks().size());
        assertEquals("PA", result.tasks().get(0).evaluationType());
        assertEquals("Participación en Clase", result.tasks().get(0).evaluationDescription());
        assertNotNull(result.evaluationBreakdown());
        assertEquals("PA", result.evaluationBreakdown().get(0).evaluationType());
        assertEquals(Integer.valueOf(10), result.evaluationBreakdown().get(0).weightPercent(),
                "El peso 10% debe provenir del sílabo oficial, no de un literal");
    }

    @Test
    @DisplayName("Un título similar a 'PA' pero sin coincidencia oficial NO inventa rubro")
    void avoidsFalsePositiveRubroMatching() {
        when(taskQueryService.getActivities(eq(STUDENT), any(), eq("period"), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(task("t4", "PAGO de matrícula", 9, false)));

        var result = toolService.getCourseTasksAndActivities(STUDENT, COURSE_NAME);

        assertEquals("SIN_RUBRO_OFICIAL", result.tasks().get(0).evaluationType());
    }

    private static Syllabus syllabus() {
        return Syllabus.builder()
                .id(COURSE_CODE)
                .courseCode(COURSE_CODE)
                .courseName(COURSE_NAME)
                .formula("10%[PA] + 90%[PROY]")
                .evaluations(List.of(
                        SyllabusEvaluation.builder().type("PA").description("Participación en Clase")
                                .week(15).weightPercent(10).build(),
                        SyllabusEvaluation.builder().type("PROY").description("Proyecto Final")
                                .week(18).weightPercent(90).build()))
                .build();
    }

    private static TaskSyncItem task(String id, String title, int week, boolean delivered) {
        return TaskSyncItem.builder()
                .id(id)
                .studentId(STUDENT)
                .courseCode(COURSE_CODE)
                .courseName(COURSE_NAME)
                .title(title)
                .week(week)
                .homeworkStatus(delivered ? "DELIVERED" : "PENDING")
                .isDelivered(delivered)
                .build();
    }
}
