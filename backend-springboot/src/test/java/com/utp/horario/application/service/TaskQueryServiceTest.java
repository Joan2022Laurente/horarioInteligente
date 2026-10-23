package com.utp.horario.application.service;

import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import com.utp.horario.domain.model.repositories.ITaskSyncRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.domain.model.value_objets.UpcomingEvaluationDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Caso de uso de consulta de tareas (Get Student Tasks Use Case).
 *
 * <p>Todos los colaboradores son mocks: ninguna prueba toca la pasarela real ni
 * MySQL. Se respalda la degradación honesta y la resolución de sesión.</p>
 */
class TaskQueryServiceTest {

    private static final String STUDENT = "U23307609";

    private ITaskSyncRepository taskRepository;
    private IUtpPortalGateway gateway;
    private TaskQueryService queryService;

    @BeforeEach
    void setUp() {
        taskRepository = Mockito.mock(ITaskSyncRepository.class);
        gateway = Mockito.mock(IUtpPortalGateway.class);
        queryService = new TaskQueryService(taskRepository, gateway);
    }

    private UpcomingEvaluationDto upcoming(String id, String activityId, String studentStatus) {
        return new UpcomingEvaluationDto(
                id, "Tarea semanal", "PC", 3, "2026-10-20T08:00", "2026-10-27T23:59",
                "Ingeniería de Software", "c-101", "S-01", activityId,
                "ESTANDAR", studentStatus, false, "OBLIGATORIA", "MEDIA", 5);
    }

    @Test
    @DisplayName("Read Model local con datos: se sirve la copia local y no se consulta la pasarela")
    void localHitNeverTouchesPortal() {
        List<TaskSyncItem> local = List.of(TaskSyncItem.builder().id("t-1").build());
        when(taskRepository.findByStudentId(STUDENT)).thenReturn(local);

        List<TaskSyncItem> result = queryService.getTasksWithPortalFallback(STUDENT, "Bearer tok");

        assertSame(local, result);
        verifyNoInteractions(gateway);
    }

    @Test
    @DisplayName("Read Model vacío + token del transport: mapea evaluaciones próximas oficiales a tareas")
    void localEmptyMapsOfficialUpcomingEvaluations() {
        when(taskRepository.findByStudentId(STUDENT)).thenReturn(List.of());
        when(gateway.fetchUpcomingEvaluations("resolved-token", 15)).thenReturn(List.of(
                upcoming(null, "act-9", "SUBMITTED"),
                upcoming("t-2", "act-8", null)
        ));

        List<TaskSyncItem> result = queryService.getTasksWithPortalFallback(STUDENT, "resolved-token");

        assertEquals(2, result.size());
        TaskSyncItem first = result.get(0);
        assertEquals("act-9", first.getId(), "Id oficial en blanco: cae al id de la actividad");
        assertEquals("SUBMITTED", first.getHomeworkStatus());
        assertTrue(first.getIsDelivered(), "Estado SUBMITTED del portal equivale a entregada");
        assertEquals("IN_PROGRESS", first.getAssignmentProgress());
        TaskSyncItem second = result.get(1);
        assertEquals("t-2", second.getId());
        assertEquals("PENDING", second.getHomeworkStatus(), "Estado ausente: pendiente, nunca inventado");
        assertFalse(second.getIsDelivered());
        verify(gateway, never()).getStudentToken(anyString());
    }

    @Test
    @DisplayName("Read Model vacío y sin token del transport: intenta token de sesión; sin él, nunca hay fetch")
    void localEmptyWithoutTransportTokenNeverFetchesFromPortal() {
        when(taskRepository.findByStudentId(STUDENT)).thenReturn(List.of());
        // getStudentToken sin stub → Mockito responde null: sin sesión efectiva ni en el registro

        List<TaskSyncItem> result = queryService.getTasksWithPortalFallback(STUDENT, null);

        assertTrue(result.isEmpty());
        verify(gateway).getStudentToken(STUDENT);
        verify(gateway, never()).fetchUpcomingEvaluations(anyString(), anyInt());
    }

    @Test
    @DisplayName("Sin token del transport: recupera el token de sesión registrado del estudiante")
    void sessionTokenFallbackIsUsedWhenTransportTokenMissing() {
        when(taskRepository.findByStudentId(STUDENT)).thenReturn(List.of());
        when(gateway.getStudentToken(STUDENT)).thenReturn("session-token");
        when(gateway.fetchUpcomingEvaluations("session-token", 15)).thenReturn(List.of());

        List<TaskSyncItem> result = queryService.getTasksWithPortalFallback(STUDENT, null);

        assertTrue(result.isEmpty());
        verify(gateway).getStudentToken(STUDENT);
        verify(gateway).fetchUpcomingEvaluations("session-token", 15);
    }

    @Test
    @DisplayName("Actividades oficiales: delega con el token efectivo y respeta los filtros")
    void getActivitiesDelegatesWithEffectiveTokenAndFilters() {
        List<TaskSyncItem> official = List.of(TaskSyncItem.builder().id("a-1").title("Práctica semanal").build());
        when(gateway.getStudentToken(STUDENT)).thenReturn("session-token");
        when(gateway.fetchActivities(eq("session-token"), eq("week"), eq(3), eq("PENDING"), eq(true), eq("PC")))
                .thenReturn(official);

        List<TaskSyncItem> result = queryService.getActivities(STUDENT, null, "week", 3, "PENDING", true, "PC");

        assertSame(official, result);
        verify(gateway).fetchActivities("session-token", "week", 3, "PENDING", true, "PC");
    }
}
