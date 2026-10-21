package com.utp.horario.application.service.tool;

import com.utp.horario.application.dtos.AcademicToolDto.EnrolledCoursesResult;
import com.utp.horario.application.dtos.AcademicToolDto.SyllabusDetailsResult;
import com.utp.horario.domain.model.aggregate.StudentProfile;
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

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Resiliencia de la capa de aplicacion de herramientas academicas.
 *
 * <p>Garantiza que ninguna invocacion de herramienta provoque una excepcion no controlada ni
 * presente un resultado vacio sin explicacion ante un cliente MCP real.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AcademicToolServiceResilienceTest {

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

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Formato de fecha
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Una fecha con formato invalido devuelve un mensaje legible, no una excepcion")
    void invalidDateReturnsReadableMessage() {
        var result = toolService.getTodaySchedule("U23307609", "2026-13-45");

        assertEquals(0, result.totalClasses());
        assertTrue(result.classes().isEmpty());
        assertNotNull(result.message());
        assertTrue(result.message().contains("YYYY-MM-DD"),
                "El mensaje debe indicar el formato esperado");
    }

    @Test
    @DisplayName("Una fecha en formato no ISO se rechaza sin propagar DateTimeParseException")
    void nonIsoDateIsRejected() {
        var result = toolService.getTodaySchedule("U23307609", "lunes de la semana");

        assertEquals(0, result.totalClasses());
        assertNotNull(result.message());
    }

    @Test
    @DisplayName("Una fecha ausente o vacia se resuelve con la fecha actual de America/Lima")
    void missingDateFallsBackToLimaToday() {
        lenient().when(scheduleRepository.findByStudentIdAndPeriod(anyString(), anyString()))
                .thenReturn(Optional.empty());

        String expected = LocalDate.now(ZoneId.of("America/Lima")).toString();

        assertEquals(expected, toolService.getTodaySchedule("U23307609", null).date());
        assertEquals(expected, toolService.getTodaySchedule("U23307609", "   ").date());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Argumentos obligatorios
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Un course_query vacio devuelve un resultado estructurado, no un NPE")
    void blankCourseQueryReturnsStructuredResult() {
        SyllabusDetailsResult result = toolService.getSyllabusDetails("U23307609", "   ");

        assertNotNull(result);
        assertEquals("Curso no especificado", result.courseName());
        assertTrue(result.evaluations().isEmpty());
        assertTrue(result.weeklySchedule().isEmpty());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Rango de semanas lectivas
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("La semana lectiva se acota al rango institucional 1-18")
    void currentWeekIsClamped() {
        assertEquals(1, toolService.clampCurrentWeek(0));
        assertEquals(1, toolService.clampCurrentWeek(-5));
        assertEquals(18, toolService.clampCurrentWeek(99));
        assertEquals(8, toolService.clampCurrentWeek(8));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Identidad respaldada por registro persistido
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("resolvePersistedStudentCode devuelve el codigo persistido en MySQL")
    void resolvesPersistedStudentCode() {
        StudentProfile profile = new StudentProfile();
        profile.setStudentCode("U23307609");
        when(studentRepository.findByStudentCode("U23307609")).thenReturn(Optional.of(profile));

        assertEquals("U23307609", toolService.resolvePersistedStudentCode("u23307609"));
    }

    @Test
    @DisplayName("resolvePersistedStudentCode devuelve null si el estudiante no esta persistido")
    void returnsNullForUnknownStudent() {
        when(studentRepository.findByStudentCode(anyString())).thenReturn(Optional.empty());

        assertNull(toolService.resolvePersistedStudentCode("U99999999"));
    }

    @Test
    @DisplayName("resolvePersistedStudentCode rechaza identificadores con formato no institucional")
    void rejectsMalformedIdentifiers() {
        assertNull(toolService.resolvePersistedStudentCode(null));
        assertNull(toolService.resolvePersistedStudentCode(""));
        assertNull(toolService.resolvePersistedStudentCode("current-student"));
        assertNull(toolService.resolvePersistedStudentCode("'; DROP TABLE students; --"));
    }

    @Test
    @DisplayName("Un fallo de la base de datos no propaga la excepcion")
    void databaseFailureDoesNotPropagate() {
        when(studentRepository.findByStudentCode(anyString()))
                .thenThrow(new RuntimeException("Aiven Cloud no disponible"));

        assertNull(toolService.resolvePersistedStudentCode("U23307609"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Payloads vacios explicativos
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Sin asignaturas persistidas, el resultado explica el motivo")
    void emptyEnrolledCoursesExplainsTheReason() {
        lenient().when(utpPortalGateway.getStudentToken(anyString())).thenReturn(null);
        lenient().when(scheduleRepository.findByStudentIdAndPeriod(anyString(), anyString()))
                .thenReturn(Optional.empty());

        EnrolledCoursesResult result = toolService.getEnrolledCourses("U23307609");

        assertEquals(0, result.totalCourses());
        assertNotNull(result.message());
        assertTrue(result.message().contains("U23307609"));
    }
}
