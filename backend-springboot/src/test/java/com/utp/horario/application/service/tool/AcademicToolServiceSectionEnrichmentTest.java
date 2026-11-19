package com.utp.horario.application.service.tool;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.service.TaskQueryService;
import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.aggregate.TaskSyncItem;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Verifica la fusión calendario + árbol de sección con sectionId resuelto dinámicamente. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AcademicToolServiceSectionEnrichmentTest {

    private static final String STUDENT = "U23307609";
    private static final String CODE = "100000SI97";
    private static final String NAME = "SERVICIOS CLOUD";
    private static final String SECTION = "seccion-resuelta-del-horario";
    private static final String TOKEN = "Bearer token-institucional";

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

        Course course = Course.builder().code(CODE).name(NAME).build();
        ClassSession session = ClassSession.builder()
                .courseCode(CODE).courseName(NAME).sectionId(SECTION).build();
        ScheduleInterval schedule = ScheduleInterval.builder()
                .periodName("2026 - Ciclo 2 Agosto").weekNumber(15)
                .courses(List.of(course)).classes(List.of(session)).build();
        when(scheduleRepository.findByStudentIdAndPeriod(anyString(), anyString()))
                .thenReturn(Optional.of(schedule));

        StudentProfile profile = new StudentProfile();
        profile.setStudentCode(STUDENT);
        profile.setToken(TOKEN);
        when(studentRepository.findByStudentCode(STUDENT)).thenReturn(Optional.of(profile));
        when(utpPortalGateway.fetchCoursesSummary(anyString())).thenReturn(List.of());
        when(syllabusRepository.findByCourseCode(CODE)).thenReturn(Optional.of(syllabus()));
    }

    @Test
    @DisplayName("Combina calendario y árbol deduplicando y clasificando semanas pasadas/futuras")
    void mergesCalendarAndSectionTreeWithoutDuplicates() {
        when(taskQueryService.getActivities(eq(STUDENT), any(), eq("period"), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(calendarTask("PARTICIPACIÓN EN CLASE")));
        when(utpPortalGateway.fetchSectionActivities(eq(TOKEN), eq(SECTION), eq(CODE), eq(NAME)))
                .thenReturn(List.of(
                        sectionTask("PARTICIPACIÓN EN CLASE", 15, "PA"),
                        sectionTask("Práctica Calificada 1", 6, "PC1"),
                        sectionTask("Proyecto Final", 18, "PROY")));

        var result = toolService.getCourseTasksAndActivities(STUDENT, NAME);

        assertNotNull(result);
        assertEquals(3, result.totalCourseTasks(), "La actividad común no debe duplicarse");
        verify(utpPortalGateway).fetchSectionActivities(eq(TOKEN), eq(SECTION), eq(CODE), eq(NAME));

        var actualWeek = result.tasks().stream()
                .filter(t -> "PARTICIPACIÓN EN CLASE".equals(t.title())).findFirst().orElseThrow();
        assertEquals("DELIVERED", actualWeek.homeworkStatus(), "El estado del calendario prevalece");
        assertEquals("PA", actualWeek.evaluationType(), "El rubro del árbol/sílabo prevalece");
        assertEquals("SEMANA_ACTUAL_ENTREGADA", actualWeek.timingStatus());

        var past = result.tasks().stream()
                .filter(t -> "Práctica Calificada 1".equals(t.title())).findFirst().orElseThrow();
        assertEquals(6, past.week());
        assertEquals("PASADA_NO_ENTREGADA", past.timingStatus());

        var future = result.tasks().stream()
                .filter(t -> "Proyecto Final".equals(t.title())).findFirst().orElseThrow();
        assertEquals(18, future.week());
        assertEquals("FUTURA_PROGRAMADA", future.timingStatus());
    }

    @Test
    @DisplayName("Sin sectionId en el horario no se consulta el árbol y se entregan solo datos reales")
    void skipsSectionFetchWhenScheduleHasNoSectionId() {
        Course course = Course.builder().code(CODE).name(NAME).build();
        ClassSession noSection = ClassSession.builder().courseCode(CODE).courseName(NAME).build();
        when(scheduleRepository.findByStudentIdAndPeriod(anyString(), anyString())).thenReturn(Optional.of(
                ScheduleInterval.builder().periodName("2026 - Ciclo 2 Agosto").weekNumber(15)
                        .courses(List.of(course)).classes(List.of(noSection)).build()));
        when(taskQueryService.getActivities(eq(STUDENT), any(), eq("period"), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(calendarTask("PARTICIPACIÓN EN CLASE")));

        var result = toolService.getCourseTasksAndActivities(STUDENT, NAME);

        assertEquals(1, result.totalCourseTasks());
        org.mockito.Mockito.verify(utpPortalGateway, org.mockito.Mockito.never())
                .fetchSectionActivities(anyString(), anyString(), anyString(), anyString());
    }

    private static Syllabus syllabus() {
        return Syllabus.builder()
                .id(CODE).courseCode(CODE).courseName(NAME)
                .formula("10%[PA] + 30%[PC1] + 60%[PROY]")
                .evaluations(List.of(
                        SyllabusEvaluation.builder().type("PA").description("Participación en Clase")
                                .week(15).weightPercent(10).build(),
                        SyllabusEvaluation.builder().type("PC1").description("Práctica Calificada 1")
                                .week(6).weightPercent(30).build(),
                        SyllabusEvaluation.builder().type("PROY").description("Proyecto Final")
                                .week(18).weightPercent(60).build()))
                .build();
    }

    private static TaskSyncItem calendarTask(String title) {
        return TaskSyncItem.builder()
                .id("cal-" + title).courseCode(CODE).courseName(NAME).title(title)
                .week(15).homeworkStatus("DELIVERED").isDelivered(true).build();
    }

    private static TaskSyncItem sectionTask(String title, int week, String rubro) {
        return TaskSyncItem.builder()
                .contentId("sec-" + title).courseCode(CODE).courseName(NAME).sectionId(SECTION)
                .title(title).week(week).evaluationSystem(rubro).isQualified(true)
                .homeworkStatus("PENDING").build();
    }
}
