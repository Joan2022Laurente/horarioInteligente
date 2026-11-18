package com.utp.horario.application.service.tool;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.dtos.AcademicToolDto.EnrolledCoursesResult;
import com.utp.horario.application.dtos.AcademicToolDto.EvaluationSummaryDto;
import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.repositories.IStudentRepository;
import com.utp.horario.domain.model.repositories.ISyllabusRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.domain.model.value_objects.ClassSession;
import com.utp.horario.domain.model.value_objects.Course;
import com.utp.horario.domain.model.value_objects.CourseSummaryDto;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import com.utp.horario.domain.model.value_objects.SyllabusEvaluation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Verifica el aislamiento del contexto del estudiante en {@link AcademicToolService}.
 *
 * <p>El studentCode se inyecta server-side y nunca es un parametro publico de la herramienta.
 * Esta clase blinda que ningun overload pueda resolver un sílabo sin conocer al estudiante,
 * que es la raiz del defecto D1 (paridad rota entre el orquestador y el servidor MCP).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AcademicToolServiceStudentScopeTest {

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
    @DisplayName("resolveEffectiveStudentCode normaliza a mayusculas y recorta espacios")
    void resolvesStudentCodeInUpperCase() {
        assertEquals("U23307609", toolService.resolveEffectiveStudentCode("  u23307609 "));
    }

    @Test
    @DisplayName("resolveEffectiveStudentCode descarta 'current-student' y vacios")
    void rejectsPlaceholderStudentCodes() {
        assertNull(toolService.resolveEffectiveStudentCode("current-student"));
        assertNull(toolService.resolveEffectiveStudentCode("CURRENT-STUDENT"));
        assertNull(toolService.resolveEffectiveStudentCode(null));
        assertNull(toolService.resolveEffectiveStudentCode("   "));
    }

    @Test
    @DisplayName("Sin studentCode, getEnrolledCourses no filtra por ningun alumno")
    void enrolledCoursesWithoutStudentCodeDoesNotQueryRepositories() {
        when(scheduleRepository.findByStudentIdAndPeriod(anyString(), anyString()))
                .thenReturn(java.util.Optional.empty());

        EnrolledCoursesResult result = toolService.getEnrolledCourses(null);

        assertNotNull(result);
        assertEquals(0, result.totalCourses());
        assertTrue(result.message() != null && !result.message().isBlank(),
                "Sin sesion de estudiante debe explicitar el motivo");
    }

    @Test
    @DisplayName("Con studentCode, getEnrolledCourses consulta el repositorio de ese alumno")
    void enrolledCoursesUsesResolvedStudentCode() {
        lenient().when(scheduleRepository.findByStudentIdAndPeriod(anyString(), anyString()))
                .thenReturn(java.util.Optional.empty());

        EnrolledCoursesResult result = toolService.getEnrolledCourses("U23307609");

        assertNotNull(result);
        assertEquals("U23307609", result.studentCode());
    }

    @Test
    @DisplayName("getTodaySchedule sin studentCode devuelve 0 clases y un mensaje explicito")
    void todayScheduleWithoutStudentCodeReturnsEmptyWithMessage() {
        var result = toolService.getTodaySchedule(null, "2026-10-21");

        assertEquals(0, result.totalClasses());
        assertTrue(result.classes().isEmpty());
        assertNotNull(result.message());
    }

    @Test
    @DisplayName("getUpcomingEvaluations sin studentCode devuelve lista vacia")
    void upcomingEvaluationsWithoutStudentCodeReturnsEmpty() {
        assertEquals(List.of(), toolService.getUpcomingEvaluations(null, 6));
    }

    @Test
    @DisplayName("Regresion: Course.code vacio en MySQL se resuelve desde las sesiones ClassSession.courseCode")
    void blankCourseCodeResolvesFromClassSessions() {
        ScheduleInterval schedule = ScheduleInterval.builder()
                .periodName("2026 - Ciclo 2 Agosto")
                .courses(List.of(Course.builder().name("DESARROLLO WEB INTEGRADO").code("").build()))
                .classes(List.of(ClassSession.builder().courseName("DESARROLLO WEB INTEGRADO").courseCode("100000ST61").build()))
                .build();

        when(scheduleRepository.findByStudentIdAndPeriod(anyString(), anyString()))
                .thenReturn(java.util.Optional.of(schedule));

        EnrolledCoursesResult result = toolService.getEnrolledCourses("U23307609");

        assertNotNull(result);
        assertEquals(1, result.totalCourses());
        assertEquals("100000ST61", result.courses().get(0).courseCode());
        assertEquals("DESARROLLO WEB INTEGRADO", result.courses().get(0).courseName());
    }

    @Test
    @DisplayName("Regresion: Evaluaciones resuelven silabo por nombre y adoptan codigo oficial cuando findByCourseCode es vacio")
    void evaluationsResolveSyllabusByCourseName() {
        ScheduleInterval schedule = ScheduleInterval.builder()
                .periodName("2026 - Ciclo 2 Agosto")
                .courses(List.of(Course.builder().name("DESARROLLO WEB INTEGRADO").code("").build()))
                .classes(List.of(ClassSession.builder().courseName("DESARROLLO WEB INTEGRADO").courseCode("100000ST61").build()))
                .build();

        Syllabus syllabus = Syllabus.builder()
                .id("100000ST61")
                .courseCode("100000ST61")
                .courseName("DESARROLLO WEB INTEGRADO")
                .evaluations(List.of(
                        SyllabusEvaluation.builder()
                                .type("APF3")
                                .description("Avance de Proyecto Final 3")
                                .weightPercent(20)
                                .week(15)
                                .build()
                ))
                .build();

        when(scheduleRepository.findByStudentIdAndPeriod(anyString(), anyString()))
                .thenReturn(java.util.Optional.of(schedule));
        when(syllabusRepository.findByCourseCode("100000ST61")).thenReturn(java.util.Optional.empty());
        when(syllabusRepository.findByCourseName("DESARROLLO WEB INTEGRADO")).thenReturn(java.util.Optional.of(syllabus));

        List<EvaluationSummaryDto> evals = toolService.getUpcomingEvaluations("U23307609", 15);

        assertNotNull(evals);
        assertEquals(1, evals.size());
        assertEquals("100000ST61", evals.get(0).courseCode());
        assertEquals("APF3", evals.get(0).evaluationType());
        assertEquals(Integer.valueOf(15), evals.get(0).weekScheduled());
    }

    @Test
    @DisplayName("Regresion: Rama gateway con courseCode vacio se resuelve desde el horario persistido")
    void gatewayBlankCourseCodeResolvesFromPersistedSchedule() {
        StudentProfile profile = new StudentProfile();
        profile.setStudentCode("U23307609");
        profile.setToken("Bearer fake-token");
        when(studentRepository.findByStudentCode("U23307609")).thenReturn(java.util.Optional.of(profile));

        CourseSummaryDto summary = new CourseSummaryDto(
                "sec-491",
                "",
                "DESARROLLO WEB INTEGRADO",
                "Fórmula UTP",
                "Docente UTP",
                2,
                List.of()
        );
        when(utpPortalGateway.fetchCoursesSummary("Bearer fake-token")).thenReturn(List.of(summary));

        ScheduleInterval schedule = ScheduleInterval.builder()
                .periodName("2026 - Ciclo 2 Agosto")
                .classes(List.of(ClassSession.builder().courseName("DESARROLLO WEB INTEGRADO").courseCode("100000ST61").build()))
                .build();
        when(scheduleRepository.findByStudentIdAndPeriod(anyString(), anyString()))
                .thenReturn(java.util.Optional.of(schedule));

        EnrolledCoursesResult result = toolService.getEnrolledCourses("U23307609");

        assertNotNull(result);
        assertEquals(1, result.totalCourses());
        assertEquals("100000ST61", result.courses().get(0).courseCode());
        assertEquals("DESARROLLO WEB INTEGRADO", result.courses().get(0).courseName());
    }
}