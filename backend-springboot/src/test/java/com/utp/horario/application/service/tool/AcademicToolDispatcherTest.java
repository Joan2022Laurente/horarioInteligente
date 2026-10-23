package com.utp.horario.application.service.tool;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.dtos.AcademicToolDto.ClassSessionDto;
import com.utp.horario.application.dtos.AcademicToolDto.DayScheduleResult;
import com.utp.horario.application.dtos.AcademicToolDto.EnrolledCourseDto;
import com.utp.horario.application.dtos.AcademicToolDto.EnrolledCoursesResult;
import com.utp.horario.application.dtos.AcademicToolDto.EvaluationSummaryDto;
import com.utp.horario.application.dtos.AcademicToolDto.SyllabusDetailsResult;
import com.utp.horario.application.dtos.AcademicToolDto.WeeklySessionDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pruebas del despachador unificado de herramientas academicas (Fase 0.6).
 *
 * <p>Cubre la ejecución de las 4 herramientas, el parsing defensivo de argumentos, la
 * resolución dinámica de la semana lectiva de {@code get_upcoming_evaluations} y el
 * blindaje anti-aborto: una excepción de la pasarela degenera en JSON estructurado con
 * {@code isError=true}, nunca en una excepción propagada al canal de chat o MCP.</p>
 */
@ExtendWith(MockitoExtension.class)
class AcademicToolDispatcherTest {

    private static final String STUDENT = "U23307609";

    @Mock
    private AcademicToolService toolService;

    private final ObjectMapper mapper = new ObjectMapper();

    private AcademicToolDispatcher dispatcher;

    @BeforeEach
    void setUp() {
        // El despachador se construye en @BeforeEach: los @Mock ya fueron inyectados por la extensión.
        dispatcher = new AcademicToolDispatcher(toolService, mapper);
    }

    private JsonNode args(String json) throws Exception {
        return mapper.readTree(json);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Ejecución satisfactoria de las 4 herramientas
    // ─────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("get_enrolled_courses serializa el resultado del servicio")
    void dispatchesEnrolledCourses() {
        when(toolService.getEnrolledCourses(STUDENT)).thenReturn(new EnrolledCoursesResult(
                STUDENT, 1, List.of(new EnrolledCourseDto("100000SI58", "Desarrollo Web Integrado")), null));

        AcademicToolDispatcher.ToolExecution execution =
                dispatcher.dispatch("get_enrolled_courses", null, STUDENT);

        assertFalse(execution.isError());
        assertTrue(execution.json().contains("Desarrollo Web Integrado"));
        verify(toolService).getEnrolledCourses(STUDENT);
    }

    @Test
    @DisplayName("get_today_schedule respeta la fecha ISO emitida por el modelo")
    void dispatchesTodayScheduleWithExplicitDate() throws Exception {
        when(toolService.getTodaySchedule(STUDENT, "2026-10-23")).thenReturn(new DayScheduleResult(
                STUDENT, "2026-10-23", 1,
                List.of(new ClassSessionDto("100000SI58", "Desarrollo Web Integrado",
                        "08:00", "10:00", "Edificio 1", "201", "Prof. Evaluado")),
                null));

        AcademicToolDispatcher.ToolExecution execution =
                dispatcher.dispatch("get_today_schedule", args("{\"date\": \"2026-10-23\"}"), STUDENT);

        assertFalse(execution.isError());
        assertTrue(execution.json().contains("2026-10-23"));
    }

    @Test
    @DisplayName("get_today_schedule sin 'date' resuelve el día en curso (America/Lima)")
    void todayScheduleDefaultsToLimaToday() throws Exception {
        when(toolService.getTodaySchedule(eq(STUDENT), anyString()))
                .thenReturn(new DayScheduleResult(STUDENT, "2026-10-23", 1,
                        List.of(new ClassSessionDto("100000SI58", "Desarrollo Web Integrado",
                                "08:00", "10:00", "Edificio 1", "201", "Prof. Evaluado")),
                        null));

        AcademicToolDispatcher.ToolExecution execution =
                dispatcher.dispatch("get_today_schedule", args("{}"), STUDENT);

        ArgumentCaptor<String> date = ArgumentCaptor.forClass(String.class);
        verify(toolService).getTodaySchedule(eq(STUDENT), date.capture());
        assertEquals(LocalDate.now(AcademicToolService.LIMA_ZONE).toString(), date.getValue());
        assertFalse(execution.isError());
    }

    @Test
    @DisplayName("get_syllabus_details con 'week' válida aplica el filtro por semana")
    void syllabusUsesWeekFilter() throws Exception {
        when(toolService.getSyllabusDetails(STUDENT, "Desarrollo Web Integrado", 5))
                .thenReturn(new SyllabusDetailsResult(
                        "100000SI58", "Desarrollo Web Integrado", 4, "Formula de evaluación", "Meta de aprendizaje",
                        List.of(new EvaluationSummaryDto(
                                "100000SI58", "Desarrollo Web Integrado", "PC", "Ciclos de vida", 30, 5)),
                        List.of(new WeeklySessionDto(5, "Unidad 2", "Ciclos de vida", "Laboratorio", "PC1")),
                        "markdown"));

        AcademicToolDispatcher.ToolExecution execution = dispatcher.dispatch(
                "get_syllabus_details",
                args("{\"course_query\": \"Desarrollo Web Integrado\", \"week\": 5}"), STUDENT);

        assertFalse(execution.isError());
        assertTrue(execution.json().contains("Unidad 2"));
        verify(toolService).getSyllabusDetails(STUDENT, "Desarrollo Web Integrado", 5);
    }

    @Test
    @DisplayName("get_syllabus_details acepta el alias historico 'course_code'")
    void syllabusAcceptsLegacyAlias() throws Exception {
        when(toolService.getSyllabusDetails(STUDENT, "100000SI58"))
                .thenReturn(new SyllabusDetailsResult(
                        "100000SI58", "Desarrollo Web Integrado", 4, "Formula", "Meta",
                        List.of(new EvaluationSummaryDto(
                                "100000SI58", "Desarrollo Web Integrado", "PC", "Ciclos de vida", 30, 5)),
                        List.of(new WeeklySessionDto(5, "Unidad 2", "Ciclos de vida", "Laboratorio", null)),
                        "markdown"));

        AcademicToolDispatcher.ToolExecution execution =
                dispatcher.dispatch("get_syllabus_details", args("{\"course_code\": \"100000SI58\"}"), STUDENT);

        assertFalse(execution.isError());
        verify(toolService).getSyllabusDetails(STUDENT, "100000SI58");
    }

    @Test
    @DisplayName("get_upcoming_evaluations serializa la lista de evaluaciones al invocar el servicio")
    void dispatchesUpcomingEvaluations() throws Exception {
        when(toolService.resolveCurrentWeek(STUDENT)).thenReturn(9);
        when(toolService.getUpcomingEvaluations(STUDENT, 9)).thenReturn(List.of());

        AcademicToolDispatcher.ToolExecution execution =
                dispatcher.dispatch("get_upcoming_evaluations", args("{}"), STUDENT);

        assertTrue(execution.isError(), "La lista vacia se enriquece y se marca como error informativo");
        assertTrue(execution.json().contains("message"));
        verify(toolService).getUpcomingEvaluations(STUDENT, 9);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Parsing defensivo de argumentos
    // ─────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("'date' no ISO produce error estructurado y no invoca la herramienta")
    void invalidDateIsStructuredError() throws Exception {
        AcademicToolDispatcher.ToolExecution execution =
                dispatcher.dispatch("get_today_schedule", args("{\"date\": \"domingo\"}"), STUDENT);

        assertTrue(execution.isError());
        assertTrue(execution.json().contains("Argumento 'date' inválido"));
        verify(toolService, never()).getTodaySchedule(anyString(), anyString());
    }

    @Test
    @DisplayName("'week' fuera del rango lectivo consulta el sílabo completo")
    void syllabusOutOfRangeWeekQueriesComplete() throws Exception {
        when(toolService.getSyllabusDetails(STUDENT, "Desarrollo Web Integrado"))
                .thenReturn(new SyllabusDetailsResult(
                        "100000SI58", "Desarrollo Web Integrado", 4, "Formula", "Meta",
                        List.of(new EvaluationSummaryDto(
                                "100000SI58", "Desarrollo Web Integrado", "PC", "Ciclos de vida", 30, 5)),
                        List.of(new WeeklySessionDto(5, "Unidad 2", "Ciclos de vida", "Laboratorio", null)),
                        "markdown"));

        AcademicToolDispatcher.ToolExecution execution = dispatcher.dispatch(
                "get_syllabus_details",
                args("{\"course_query\": \"Desarrollo Web Integrado\", \"week\": 99}"), STUDENT);

        assertFalse(execution.isError());
        verify(toolService).getSyllabusDetails(STUDENT, "Desarrollo Web Integrado");
        verify(toolService, never()).getSyllabusDetails(anyString(), anyString(), anyInt());
    }

    @Test
    @DisplayName("'week' no numérica consulta el sílabo completo")
    void syllabusNonNumericWeekQueriesComplete() throws Exception {
        when(toolService.getSyllabusDetails(STUDENT, "Desarrollo Web Integrado"))
                .thenReturn(new SyllabusDetailsResult(
                        "100000SI58", "Desarrollo Web Integrado", 4, "Formula", "Meta",
                        List.of(new EvaluationSummaryDto(
                                "100000SI58", "Desarrollo Web Integrado", "PC", "Ciclos de vida", 30, 5)),
                        List.of(new WeeklySessionDto(5, "Unidad 2", "Ciclos de vida", "Laboratorio", null)),
                        "markdown"));

        dispatcher.dispatch("get_syllabus_details",
                args("{\"course_query\": \"Desarrollo Web Integrado\", \"week\": \"semana cinco\"}"), STUDENT);

        verify(toolService).getSyllabusDetails(STUDENT, "Desarrollo Web Integrado");
        verify(toolService, never()).getSyllabusDetails(anyString(), anyString(), anyInt());
    }

    @Test
    @DisplayName("'course_query' vacío produce error estructurado y no invoca la herramienta")
    void syllabusEmptyQueryIsStructuredError() throws Exception {
        AcademicToolDispatcher.ToolExecution execution = dispatcher.dispatch(
                "get_syllabus_details", args("{\"course_query\": \"   \"}"), STUDENT);

        assertTrue(execution.isError());
        assertTrue(execution.json().contains("course_query"));
        verify(toolService, never()).getSyllabusDetails(anyString(), anyString());
        verify(toolService, never()).getSyllabusDetails(anyString(), anyString(), anyInt());
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Resolución de current_week en get_upcoming_evaluations (Fase 0.6)
    // ─────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("current_week explícita dentro del rango se respeta")
    void explicitWeekIsRespected() throws Exception {
        when(toolService.getUpcomingEvaluations(STUDENT, 7)).thenReturn(List.of());

        dispatcher.dispatch("get_upcoming_evaluations", args("{\"current_week\": 7}"), STUDENT);

        verify(toolService).getUpcomingEvaluations(STUDENT, 7);
        verify(toolService, never()).resolveCurrentWeek(anyString());
    }

    @Test
    @DisplayName("current_week explícita fuera de rango se acota al rango lectivo 1-18")
    void explicitWeekIsClamped() throws Exception {
        when(toolService.getUpcomingEvaluations(anyString(), anyInt())).thenReturn(List.of());

        dispatcher.dispatch("get_upcoming_evaluations", args("{\"current_week\": 99}"), STUDENT);
        verify(toolService).getUpcomingEvaluations(STUDENT, 18);

        dispatcher.dispatch("get_upcoming_evaluations", args("{\"current_week\": 0}"), STUDENT);
        verify(toolService).getUpcomingEvaluations(STUDENT, 1);
        verify(toolService, never()).resolveCurrentWeek(anyString());
    }

    @Test
    @DisplayName("cadena numérica ('11') se acepta como semana")
    void numericStringWeekAccepted() throws Exception {
        when(toolService.getUpcomingEvaluations(STUDENT, 11)).thenReturn(List.of());

        dispatcher.dispatch("get_upcoming_evaluations", args("{\"current_week\": \"11\"}"), STUDENT);

        verify(toolService).getUpcomingEvaluations(STUDENT, 11);
    }

    @Test
    @DisplayName("current_week ausente o no interpretable se resuelve dinámicamente desde el snapshot")
    void absentOrNonInterpretableResolvesDynamically() throws Exception {
        when(toolService.resolveCurrentWeek(STUDENT)).thenReturn(8);
        when(toolService.getUpcomingEvaluations(STUDENT, 8)).thenReturn(List.of());

        dispatcher.dispatch("get_upcoming_evaluations", args("{}"), STUDENT);
        dispatcher.dispatch("get_upcoming_evaluations", args("{\"current_week\": \"semana seis\"}"), STUDENT);

        verify(toolService, times(2)).resolveCurrentWeek(STUDENT);
        verify(toolService, times(2)).getUpcomingEvaluations(STUDENT, 8);
    }

    @Test
    @DisplayName("sin snapshot dinámico cae en la semana por defecto 6 (último recurso)")
    void fallsBackToStaticDefaultWithoutSnapshot() throws Exception {
        when(toolService.resolveCurrentWeek(STUDENT)).thenReturn(null);
        when(toolService.getUpcomingEvaluations(STUDENT, AcademicToolDispatcher.DEFAULT_CURRENT_WEEK))
                .thenReturn(List.of());

        dispatcher.dispatch("get_upcoming_evaluations", args("{}"), STUDENT);

        verify(toolService).getUpcomingEvaluations(STUDENT, 6);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Blindaje ante fallos de herramienta
    // ─────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("herramienta desconocida produce error estructurado con herramientas soportadas")
    void unknownToolReturnsStructuredError() throws Exception {
        AcademicToolDispatcher.ToolExecution execution =
                dispatcher.dispatch("drop_all_students", args("{}"), STUDENT);

        assertTrue(execution.isError());
        assertTrue(execution.json().contains("drop_all_students"));
        assertTrue(execution.json().contains("Herramienta no implementada"));
        assertTrue(execution.json().contains("supportedTools"));
        assertTrue(execution.json().contains("get_enrolled_courses"));
    }

    @Test
    @DisplayName("nombre de herramienta ausente produce error estructurado")
    void blankToolNameIsStructuredError() {
        AcademicToolDispatcher.ToolExecution execution = dispatcher.dispatch("   ", null, STUDENT);

        assertTrue(execution.isError());
        assertTrue(execution.json().contains("Nombre de herramienta ausente"));
    }

    @Test
    @DisplayName("sesión de estudiante ausente produce error estructurado")
    void blankStudentCodeIsStructuredError() throws Exception {
        AcademicToolDispatcher.ToolExecution execution =
                dispatcher.dispatch("get_enrolled_courses", args("{}"), "   ");

        assertTrue(execution.isError());
        assertTrue(execution.json().contains("No se identificó una sesión de estudiante activa"));
        verify(toolService, never()).getEnrolledCourses(anyString());
    }

    @Test
    @DisplayName("excepción de la pasarela degenera en JSON isError=true sin abortar el ciclo")
    void gatewayExceptionDegeneratesToStructuredError() {
        when(toolService.getEnrolledCourses(STUDENT))
                .thenThrow(new RuntimeException("timeout de pasarela"));

        AcademicToolDispatcher.ToolExecution execution =
                dispatcher.dispatch("get_enrolled_courses", null, STUDENT);

        assertTrue(execution.isError());
        assertTrue(execution.json().contains("Error ejecutando get_enrolled_courses"));
        assertTrue(execution.json().contains("timeout de pasarela"));
        assertTrue(execution.json().contains("supportedTools"));
    }

    @Test
    @DisplayName("payload vacío del servicio se enriquece con mensaje explicativo")
    void emptyPayloadGetsEnrichedMessage() {
        when(toolService.getEnrolledCourses(STUDENT))
                .thenReturn(new EnrolledCoursesResult(STUDENT, 0, List.of(), null));

        AcademicToolDispatcher.ToolExecution execution =
                dispatcher.dispatch("get_enrolled_courses", null, STUDENT);

        assertTrue(execution.isError(), "Payload vacio se marca isError=true");
        assertTrue(execution.json().contains("No se encontraron datos persistidos"));
        assertTrue(execution.json().contains("message"));
    }
}
