package com.utp.horario.interfaces.rest;

import com.utp.horario.application.command.SyncTaskCommand;
import com.utp.horario.application.dtos.AcademicToolDto.UpcomingEvaluationDto;
import com.utp.horario.application.handle.SyncTaskCommandHandler;
import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.infraestructure.security.CurrentStudent;
import com.utp.horario.infraestructure.security.SecurityIdentityResolver;
import com.utp.horario.interfaces.rest.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/tasks", "/api/v1/tasks"})
@RequiredArgsConstructor
public class TaskController {

    private final SyncTaskCommandHandler taskCommandHandler;
    private final SecurityIdentityResolver identityResolver;
    private final IUtpPortalGateway utpPortalGateway;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskSyncItem>>> getTasks(
            @CurrentStudent(required = false) String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String token) {
        List<TaskSyncItem> tasks = taskCommandHandler.getTasksForStudent(studentId);
        if (tasks == null || tasks.isEmpty()) {
            String effectiveToken = (token != null && !token.isBlank()) ? token : identityResolver.extractBearerToken(authHeader);
            if ((effectiveToken == null || effectiveToken.isBlank()) && studentId != null) {
                effectiveToken = utpPortalGateway.getStudentToken(studentId);
            }
            if (effectiveToken != null && !effectiveToken.isBlank()) {
                List<UpcomingEvaluationDto> upcoming = utpPortalGateway.fetchUpcomingEvaluations(effectiveToken, 15);
                if (upcoming != null && !upcoming.isEmpty()) {
                    List<TaskSyncItem> mapped = upcoming.stream().map(u -> TaskSyncItem.builder()
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
                            .build()
                    ).toList();
                    return ResponseEntity.ok(ApiResponse.ok(mapped));
                }
            }
        }
        return ResponseEntity.ok(ApiResponse.ok(tasks));
    }

    @GetMapping("/activities")
    public ResponseEntity<ApiResponse<List<TaskSyncItem>>> getActivities(
            @CurrentStudent(required = false) String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String token,
            @RequestParam(required = false) Integer week) {
        String effectiveToken = (token != null && !token.isBlank()) ? token : identityResolver.extractBearerToken(authHeader);
        if ((effectiveToken == null || effectiveToken.isBlank()) && studentId != null) {
            effectiveToken = utpPortalGateway.getStudentToken(studentId);
        }
        List<TaskSyncItem> activities = utpPortalGateway.fetchActivitiesByWeek(effectiveToken, week);
        return ResponseEntity.ok(ApiResponse.ok(activities));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<UpcomingEvaluationDto>>> getUpcoming(
            @CurrentStudent(required = false) String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String token,
            @RequestParam(defaultValue = "15") int limit) {
        String effectiveToken = (token != null && !token.isBlank()) ? token : identityResolver.extractBearerToken(authHeader);
        if ((effectiveToken == null || effectiveToken.isBlank()) && studentId != null) {
            effectiveToken = utpPortalGateway.getStudentToken(studentId);
        }
        List<UpcomingEvaluationDto> upcoming = utpPortalGateway.fetchUpcomingEvaluations(effectiveToken, limit);
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
