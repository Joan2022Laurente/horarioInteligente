package com.utp.horario.interfaces.rest;

import com.utp.horario.application.command.SyncTaskCommand;
import com.utp.horario.application.handle.SyncTaskCommandHandler;
import com.utp.horario.application.service.TaskQueryService;
import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import com.utp.horario.domain.model.value_objects.UpcomingEvaluationDto;
import com.utp.horario.infrastructure.security.CurrentStudent;
import com.utp.horario.infrastructure.security.SecurityIdentityResolver;
import com.utp.horario.interfaces.rest.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints de tareas/actividades. La regla de direcciones DDD manda: interfaces
 * ➜ application ➜ dominio. Aquí solo se compone el comando desde el transport
 * (identidad, token del encabezado/parámetro) y se delega a los casos de uso de
 * application — el controlador no toca puertos de dominio (IUtpPortalGateway).
 */
@RestController
@RequestMapping({"/tasks", "/api/v1/tasks"})
@RequiredArgsConstructor
public class TaskController {

    private final SyncTaskCommandHandler taskCommandHandler;
    private final TaskQueryService taskQueryService;
    private final SecurityIdentityResolver identityResolver;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskSyncItem>>> getTasks(
            @CurrentStudent(required = false) String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String token) {
        String resolvedToken = (token != null && !token.isBlank()) ? token : identityResolver.extractBearerToken(authHeader);
        return ResponseEntity.ok(ApiResponse.ok(taskQueryService.getTasksWithPortalFallback(studentId, resolvedToken)));
    }

    @GetMapping("/activities")
    public ResponseEntity<ApiResponse<List<TaskSyncItem>>> getActivities(
            @CurrentStudent(required = false) String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String token,
            @RequestParam(required = false) String intervalMode,
            @RequestParam(required = false) Integer week,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean onlyGraded,
            @RequestParam(required = false) String type) {
        String resolvedToken = (token != null && !token.isBlank()) ? token : identityResolver.extractBearerToken(authHeader);
        List<TaskSyncItem> activities = taskQueryService.getActivities(
                studentId, resolvedToken, intervalMode, week, status, onlyGraded, type);
        return ResponseEntity.ok(ApiResponse.ok(activities));
    }

    @GetMapping("/{sectionId}/{activityId}")
    public ResponseEntity<ApiResponse<com.fasterxml.jackson.databind.JsonNode>> getTaskDetail(
            @PathVariable String sectionId,
            @PathVariable String activityId,
            @CurrentStudent(required = false) String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String token) {
        String resolvedToken = (token != null && !token.isBlank()) ? token : identityResolver.extractBearerToken(authHeader);
        com.fasterxml.jackson.databind.JsonNode detail =
                taskQueryService.getTaskDetail(studentId, resolvedToken, sectionId, activityId);
        if (detail == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<UpcomingEvaluationDto>>> getUpcoming(
            @CurrentStudent(required = false) String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String token,
            @RequestParam(defaultValue = "15") int limit) {
        String resolvedToken = (token != null && !token.isBlank()) ? token : identityResolver.extractBearerToken(authHeader);
        List<UpcomingEvaluationDto> upcoming = taskQueryService.getUpcomingEvaluations(studentId, resolvedToken, limit);
        return ResponseEntity.ok(ApiResponse.ok(upcoming));
    }

    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<List<TaskSyncItem>>> syncTasks(
            @CurrentStudent String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String token,
            @RequestParam(required = false) String sectionId) {
        String effectiveToken = (token != null && !token.isBlank()) ? token : identityResolver.extractBearerToken(authHeader);
        if (effectiveToken == null || effectiveToken.isBlank()) {
            throw new SecurityException("Se requiere un token de sesión legítimo para sincronizar tareas");
        }
        SyncTaskCommand command = SyncTaskCommand.builder()
                .studentId(studentId)
                .token(effectiveToken)
                .sectionId(sectionId)
                .build();
        List<TaskSyncItem> synced = taskCommandHandler.handle(command);
        return ResponseEntity.ok(ApiResponse.ok("Tareas sincronizadas", synced));
    }

    @PostMapping("/{taskId}/deliver")
    public ResponseEntity<ApiResponse<TaskSyncItem>> markDelivered(
            @PathVariable String taskId,
            @CurrentStudent String studentId) {
        TaskSyncItem updated = taskCommandHandler.markTaskAsDelivered(taskId, studentId);
        return ResponseEntity.ok(ApiResponse.ok("Tarea marcada como entregada", updated));
    }
}
