package com.utp.horario.application.service;

import com.utp.horario.application.dtos.SessionBootstrapDto.SessionBootstrapResult;
import com.utp.horario.application.handle.GenerateScheduleCommandHandler;
import com.utp.horario.application.handle.SyncTaskCommandHandler;
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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pruebas del Auto-Bootstrap Integral de sesión (Fase 0.7, estrategia local-first)
 * con mocks puros.
 *
 * <p>Ningún test toca la pasarela real, MySQL ni OpenRouter: el handler de horario y el
 * servicio de sílabos son mocks, de modo que se verifican la orquestación local-first,
 * la ventana de vigencia del snapshot, la deduplicación de cursos, el conteo honesto de
 * faltantes ante sílabos no verificables y la regla de honestidad (nunca se completa un
 * bootstrap con datos inventados).</p>
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

    @Mock
    private SyncTaskCommandHandler taskPrimerHandler;

    private SessionBootstrapService bootstrapService;

    @BeforeEach
    void setUp() {
        bootstrapService = new SessionBootstrapService(scheduleSyncHandler, syllabusService, taskPrimerHandler);
    }

    // El Paso 1 del bootstrap fija la ventana de vigencia en el día en curso.
    private ScheduleInterval stubFreshSchedule() throws Exception {
        ScheduleInterval schedule = scheduleWith(
                List.of(Course.builder().code("100000SI58").section("101").build()),
                List.of(
                        classOf("100000SI58", "101"),
                        classOf("100000SI89", "201"),
                        classOf("100000US71", "301")));
        when(scheduleSyncHandler.ensureFreshSchedule(eq(STUDENT), eq(TOKEN), eq(PERIOD), any(LocalDate.class)))
                .thenReturn(schedule);
        return schedule;
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
    @DisplayName("Pipeline completo: horario local-first + sílabos locales-first para los cursos matriculados")
    void fullPipelineSyncsScheduleAndSyllabi() throws Exception {
        stubFreshSchedule();
        when(syllabusService.getSyllabus(anyString(), anyString(), nullable(String.class), eq(TOKEN)))
                .thenReturn(mock(Syllabus.class));

        SessionBootstrapResult result = bootstrapService.bootstrapStudentData(STUDENT, TOKEN, PERIOD);

        assertTrue(result.scheduleSynced());
        assertEquals(3, result.coursesCount(), "El curso repetido en declaracion y clases no se duplica");
        assertEquals(3, result.syllabiSynced());
        assertEquals(3, result.syllabiTotal());
        verify(scheduleSyncHandler).ensureFreshSchedule(eq(STUDENT), eq(TOKEN), eq(PERIOD), any(LocalDate.class));
    }

    @Test
    @DisplayName("El bootstrap fija la ventana de vigencia del snapshot en el día en curso")
    void freshnessWindowIsToday() throws Exception {
        stubFreshSchedule();
        when(syllabusService.getSyllabus(anyString(), anyString(), nullable(String.class), eq(TOKEN)))
                .thenReturn(mock(Syllabus.class));

        bootstrapService.bootstrapStudentData(STUDENT, TOKEN, PERIOD);

        verify(scheduleSyncHandler).ensureFreshSchedule(eq(STUDENT), eq(TOKEN), eq(PERIOD), eq(LocalDate.now()));
    }

    @Test
    @DisplayName("Periodo nulo cae en el periodo lectivo canónico del contrato de persistencia")
    void nullPeriodFallsBackToCanonicalPeriod() throws Exception {
        ScheduleInterval schedule = scheduleWith(List.of(), List.of(classOf("100000SI58", "101")));
        when(scheduleSyncHandler.ensureFreshSchedule(eq(STUDENT), eq(TOKEN), eq(PERIOD), any(LocalDate.class)))
                .thenReturn(schedule);
        when(syllabusService.getSyllabus(anyString(), anyString(), nullable(String.class), eq(TOKEN)))
                .thenReturn(mock(Syllabus.class));

        bootstrapService.bootstrapStudentData(STUDENT, TOKEN, null);

        verify(scheduleSyncHandler).ensureFreshSchedule(eq(STUDENT), eq(TOKEN), eq(PERIOD), any(LocalDate.class));
    }

    @Test
    @DisplayName("Sílabo no verificable en un curso NO aborta el resto y queda reportado como pendiente")
    void unavailableSyllabusIsCountedAsPending() throws Exception {
        stubFreshSchedule();
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
    @DisplayName("Pasarela sin horario (sin snapshot local): bootstrap sin datos reservados, sin tocar sílabos")
    void scheduleUnavailableReportsFailureWithoutSyllabusCalls() throws Exception {
        when(scheduleSyncHandler.ensureFreshSchedule(eq(STUDENT), eq(TOKEN), eq(PERIOD), any(LocalDate.class)))
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
    @DisplayName("Identidad ausente es rechazada antes de invocar al handler de horario")
    void blankIdentityIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> bootstrapService.bootstrapStudentData("   ", TOKEN, PERIOD));
        verify(scheduleSyncHandler, never()).ensureFreshSchedule(anyString(), anyString(), anyString(), any());
        verify(scheduleSyncHandler, never()).handle(any());
    }
}
