package com.utp.horario.application.service;

import com.utp.horario.application.command.GenerateScheduleCommand;
import com.utp.horario.application.dtos.SessionBootstrapDto.SessionBootstrapResult;
import com.utp.horario.application.handle.GenerateScheduleCommandHandler;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.exceptions.ScheduleUnavailableException;
import com.utp.horario.domain.model.exceptions.SyllabusUnavailableException;
import com.utp.horario.domain.model.value_objects.ClassSession;
import com.utp.horario.domain.model.value_objects.Course;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pruebas del Auto-Bootstrap Integral de sesión (Fase 0.7) con mocks puros.
 *
 * <p>Ningún test toca la pasarela real, MySQL ni OpenRouter: el handler de horario y el
 * servicio de sílabos son mocks, de modo que se verifican la orquestación, la deduplicación
 * de cursos, el conteo honesto de faltantes ante sílabos no verificables y la regla de
 * honestidad (nunca se completa un bootstrap con datos inventados).</p>
 */
@ExtendWith(MockitoExtension.class)
class SessionBootstrapServiceTest {

    private static final String STUDENT = "U23307609";
    private static final String TOKEN = "Bearer token-fake";
    private static final String PERIOD = "2026 - Ciclo 2 Agosto";

    @Mock
    private GenerateScheduleCommandHandler scheduleSyncHandler;

    @Mock
    private SyllabusService syllabusService;

    private SessionBootstrapService bootstrapService;

    @BeforeEach
    void setUp() {
        bootstrapService = new SessionBootstrapService(scheduleSyncHandler, syllabusService);
    }

    private ScheduleInterval scheduleWith(List<Course> courses, List<ClassSession> classes) {
        return ScheduleInterval.builder()
                .id("interval-001")
                .periodName(PERIOD)
                .weekNumber(4)
                .courses(courses)
                .classes(classes)
                .build();
    }

    private ClassSession classOf(String courseCode, String sectionId) {
        return ClassSession.builder().courseCode(courseCode).sectionId(sectionId).build();
    }

    @Test
    @DisplayName("Pipeline completo: horario persistido + sílabos locales-first para los cursos matriculados")
    void fullPipelineSyncsScheduleAndSyllabi() {
        when(scheduleSyncHandler.handle(anyCommand()))
                .thenReturn(scheduleWith(
                        List.of(Course.builder().code("100000SI58").section("101").build()),
                        List.of(
                                classOf("100000SI58", "101"),
                                classOf("100000SI89", "201"),
                                classOf("100000US71", "301"))));
        when(syllabusService.getSyllabus(anyString(), anyString(), nullable(String.class), eq(TOKEN)))
                .thenReturn(mock(Syllabus.class));

        SessionBootstrapResult result = bootstrapService.bootstrapStudentData(STUDENT, TOKEN, PERIOD);

        assertTrue(result.scheduleSynced());
        assertEquals(3, result.coursesCount(), "El curso repetido en declaracion y clases no se duplica");
        assertEquals(3, result.syllabiSynced());
        assertEquals(3, result.syllabiTotal());
        verify(scheduleSyncHandler, times(1)).handle(anyCommand());
    }

    @Test
    @DisplayName("El comando hereda el periodo pedido por el consumidor")
    void periodIsForwardedToScheduleSync() {
        when(scheduleSyncHandler.handle(anyCommand()))
                .thenReturn(scheduleWith(List.of(), List.of(classOf("100000SI58", "101"))));
        when(syllabusService.getSyllabus(anyString(), anyString(), nullable(String.class), eq(TOKEN)))
                .thenReturn(mock(Syllabus.class));

        bootstrapService.bootstrapStudentData(STUDENT, TOKEN, PERIOD);

        verify(scheduleSyncHandler).handle(argThat(cmd ->
                STUDENT.equals(cmd.getStudentId()) && PERIOD.equals(cmd.getPeriod())
                        && TOKEN.equals(cmd.getToken())));
    }

    @Test
    @DisplayName("Sílabo no verificable en un curso NO aborta el resto y queda reportado como pendiente")
    void unavailableSyllabusIsCountedAsPending() {
        when(scheduleSyncHandler.handle(anyCommand()))
                .thenReturn(scheduleWith(List.of(), List.of(
                        classOf("100000SI58", "101"),
                        classOf("100000SI89", "201"),
                        classOf("100000US71", "301"))));
        when(syllabusService.getSyllabus("100000SI58", "101", null, TOKEN))
                .thenReturn(mock(Syllabus.class));
        when(syllabusService.getSyllabus("100000SI89", "201", null, TOKEN))
                .thenThrow(new SyllabusUnavailableException("La pasarela no entregó contenido verificable."));
        when(syllabusService.getSyllabus("100000US71", "301", null, TOKEN))
                .thenReturn(mock(Syllabus.class));

        SessionBootstrapResult result = bootstrapService.bootstrapStudentData(STUDENT, TOKEN, PERIOD);

        assertTrue(result.scheduleSynced());
        assertEquals(3, result.coursesCount());
        assertEquals(2, result.syllabiSynced(), "Solo los sílabos verificables cuentan como sincronizados");
        assertEquals(3, result.syllabiTotal());
    }

    @Test
    @DisplayName("Pasarela sin horario: bootstrap sin datos reservados, sin tocar sílabos")
    void scheduleUnavailableReportsFailureWithoutSyllabusCalls() {
        when(scheduleSyncHandler.handle(anyCommand()))
                .thenThrow(new ScheduleUnavailableException("La pasarela oficial no respondió."));

        SessionBootstrapResult result = bootstrapService.bootstrapStudentData(STUDENT, TOKEN, PERIOD);

        assertFalse(result.scheduleSynced());
        assertEquals(0, result.coursesCount());
        assertEquals(0, result.syllabiSynced());
        assertEquals(0, result.syllabiTotal());
        verify(syllabusService, never()).getSyllabus(anyString(), anyString(), nullable(String.class),
                nullable(String.class));
    }

    @Test
    @DisplayName("Identidad ausente es rechazada antes de invocar la pasarela")
    void blankIdentityIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> bootstrapService.bootstrapStudentData("   ", TOKEN, PERIOD));
        verify(scheduleSyncHandler, never()).handle(anyCommand());
    }

    @Test
    @DisplayName("Periodo nulo cae en el periodo lectivo canónico del contrato de persistencia")
    void nullPeriodFallsBackToCanonicalPeriod() {
        when(scheduleSyncHandler.handle(anyCommand()))
                .thenReturn(scheduleWith(List.of(), List.of(classOf("100000SI58", "101"))));
        when(syllabusService.getSyllabus(anyString(), anyString(), nullable(String.class), eq(TOKEN)))
                .thenReturn(mock(Syllabus.class));

        bootstrapService.bootstrapStudentData(STUDENT, TOKEN, null);

        verify(scheduleSyncHandler).handle(argThat(cmd ->
                STUDENT.equals(cmd.getStudentId()) && PERIOD.equals(cmd.getPeriod())
                        && TOKEN.equals(cmd.getToken())));
    }

    private GenerateScheduleCommand anyCommand() {
        return ArgumentMatchers.any(GenerateScheduleCommand.class);
    }
}
