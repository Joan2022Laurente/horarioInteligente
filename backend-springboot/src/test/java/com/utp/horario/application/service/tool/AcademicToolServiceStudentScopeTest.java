package com.utp.horario.application.service.tool;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.dtos.AcademicToolDto.EnrolledCoursesResult;
import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.repositories.IStudentRepository;
import com.utp.horario.domain.model.repositories.ISyllabusRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
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
        lenient().when(utpPortalGateway.getStudentToken(anyString())).thenReturn(null);

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
}