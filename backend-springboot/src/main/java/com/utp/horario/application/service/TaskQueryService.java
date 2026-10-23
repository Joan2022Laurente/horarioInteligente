package com.utp.horario.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import com.utp.horario.domain.model.repositories.ITaskSyncRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.domain.model.value_objets.UpcomingEvaluationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Caso de uso de consulta de tareas (Get Student Tasks Use Case).
 *
 * <p>Canaliza por la Aplicación toda lectura de tareas del estudiante: Read Model
 * local, degradación honesta a la pasarela cuando no existe copia local, y
 * consultas de actividades, detalle y evaluaciones próximas oficiales. La regla
 * de direcciones DDD exige interfaces ➜ application ➜ dominio, nunca el salto
 * directo del controlador hacia el puerto de dominio.</p>
 *
 * <p>Regla de honestidad de datos: si ni el Read Model ni la pasarela entregan
 * tareas, se responde la lista local (posiblemente vacía) — nunca se inventan
 * tareas sintéticas.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TaskQueryService {

    private final ITaskSyncRepository taskRepository;
    private final IUtpPortalGateway utpPortalGateway;

    /**
     * Read Model local: tareas ya sincronizadas para ese estudiante.
     * Sin identidad legítima no hay datos propios: lista vacía.
     */
    public List<TaskSyncItem> getTasksForStudent(String studentId) {
        if (studentId == null || studentId.isBlank() || "current-student".equalsIgnoreCase(studentId)) {
            return List.of();
        }
        return taskRepository.findByStudentId(studentId);
    }

    /**
     * Tareas con degradación honesta: primero el Read Model local; solo si está
     * vacío y existe sesión legítima consulta la pasarela (evaluaciones próximas
     * oficiales) y las mapea a agregados de tarea. Acepta el token ya resuelto
     * desde el transport (parámetro o encabezado Authorization) y añade el fallback
     * del token de sesión registrado para el estudiante.
     */
    public List<TaskSyncItem> getTasksWithPortalFallback(String studentId, String resolvedToken) {
        List<TaskSyncItem> tasks = getTasksForStudent(studentId);
        if (tasks != null && !tasks.isEmpty()) {
            return tasks;
        }
        String effectiveToken = effectiveSessionToken(studentId, resolvedToken);
        if (effectiveToken == null || effectiveToken.isBlank()) {
            return tasks;
        }
        List<UpcomingEvaluationDto> upcoming = utpPortalGateway.fetchUpcomingEvaluations(effectiveToken, 15);
        if (upcoming == null || upcoming.isEmpty()) {
            log.warn("[TaskQueryService] ⚠️ Sin copia local ni datos oficiales del portal para [{}]", studentId);
            return tasks;
        }
        return upcoming.stream().map(TaskQueryService::toTaskSyncItem).toList();
    }

    /** Actividades oficiales filtradas por intervalo/semana/estado/formato de calificación. */
    public List<TaskSyncItem> getActivities(String studentId, String resolvedToken,
                                            String intervalMode, Integer week,
                                            String status, Boolean onlyGraded, String type) {
        return utpPortalGateway.fetchActivities(
                effectiveSessionToken(studentId, resolvedToken),
                intervalMode, week, status, onlyGraded, type);
    }

    /** Detalle oficial de una actividad/entrega; {@code null} = MISS (el cliente responde 404). */
    public JsonNode getTaskDetail(String studentId, String resolvedToken, String sectionId, String activityId) {
        return utpPortalGateway.fetchTaskDetail(
                effectiveSessionToken(studentId, resolvedToken), sectionId, activityId);
    }

    /** Evaluaciones próximas oficiales publicadas en el portal, sin copia local. */
    public List<UpcomingEvaluationDto> getUpcomingEvaluations(String studentId, String resolvedToken, int limit) {
        return utpPortalGateway.fetchUpcomingEvaluations(
                effectiveSessionToken(studentId, resolvedToken), limit);
    }

    /**
     * Resolución de sesión: el token del transport manda (ya resuelto por la capa
     * interfaces desde parámetro o encabezado); si no hay, se consulta el token de
     * sesión registrado para ese estudiante.
     */
    private String effectiveSessionToken(String studentId, String resolvedToken) {
        if (resolvedToken != null && !resolvedToken.isBlank()) {
            return resolvedToken;
        }
        if (studentId != null) {
            return utpPortalGateway.getStudentToken(studentId);
        }
        return null;
    }

    /** Mapeo de la evaluación próxima oficial ➜ agregado de tarea del usuario. */
    private static TaskSyncItem toTaskSyncItem(UpcomingEvaluationDto u) {
        return TaskSyncItem.builder()
                .id(u.id() != null && !u.id().isBlank() ? u.id() : u.activityId())
                .courseName(u.courseName())
                .sectionId(u.sectionId())
                .homeworkId(u.activityId())
                .title(u.title())
                .type(u.activityType())
                .week(u.weekNumber())
                .homeworkStatus(u.studentStatus() != null && !u.studentStatus().isBlank() ? u.studentStatus() : "PENDING")
                .assignmentProgress("IN_PROGRESS")
                .isDelivered("DELIVERED".equalsIgnoreCase(u.studentStatus()) || "SUBMITTED".equalsIgnoreCase(u.studentStatus()))
                .build();
    }
}
