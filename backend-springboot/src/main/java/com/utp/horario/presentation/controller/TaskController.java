package com.utp.horario.presentation.controller;

import com.utp.horario.domain.model.TaskSyncItem;
import com.utp.horario.domain.model.tool.AcademicToolDto.UpcomingEvaluationDto;
import com.utp.horario.domain.port.in.TaskSyncServicePort;
import com.utp.horario.domain.port.out.UtpPortalGatewayPort;
import com.utp.horario.infrastructure.security.CurrentStudent;
import com.utp.horario.infrastructure.security.SecurityIdentityResolver;
import com.utp.horario.presentation.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskSyncServicePort taskSyncServicePort;
    private final SecurityIdentityResolver identityResolver;
    private final UtpPortalGatewayPort utpPortalGatewayPort;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskSyncItem>>> getTasks(
            @CurrentStudent(required = false) String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String token) {
        List<TaskSyncItem> tasks = taskSyncServicePort.getTasksForStudent(studentId);
        if (tasks == null || tasks.isEmpty()) {
            String effectiveToken = (token != null && !token.isBlank()) ? token : identityResolver.extractBearerToken(authHeader);
            if ((effectiveToken == null || effectiveToken.isBlank()) && studentId != null) {
                effectiveToken = utpPortalGatewayPort.getStudentToken(studentId);
            }
            if (effectiveToken != null && !effectiveToken.isBlank()) {
                List<UpcomingEvaluationDto> upcoming = utpPortalGatewayPort.fetchUpcomingEvaluations(effectiveToken, 15);
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

    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<UpcomingEvaluationDto>>> getUpcoming(
            @CurrentStudent(required = false) String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String token,
            @RequestParam(defaultValue = "15") int limit) {
        String effectiveToken = (token != null && !token.isBlank()) ? token : identityResolver.extractBearerToken(authHeader);
        if ((effectiveToken == null || effectiveToken.isBlank()) && studentId != null) {
            effectiveToken = utpPortalGatewayPort.getStudentToken(studentId);
        }
        List<UpcomingEvaluationDto> upcoming = utpPortalGatewayPort.fetchUpcomingEvaluations(effectiveToken, limit);
        return ResponseEntity.ok(ApiResponse.ok(upcoming));
    }

    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<List<TaskSyncItem>>> syncTasks(
            @CurrentStudent String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String token,
            @RequestParam String sectionId) {
        String effectiveToken = (token != null && !token.isBlank()) ? token : identityResolver.extractBearerToken(authHeader);
        if (effectiveToken == null || effectiveToken.isBlank()) {
            throw new SecurityException("Se requiere un token de sesión legítimo para sincronizar tareas");
        }
        List<TaskSyncItem> synced = taskSyncServicePort.syncTasksFromUtp(effectiveToken, sectionId);
        return ResponseEntity.ok(ApiResponse.ok("Tareas sincronizadas", synced));
    }

    @PostMapping("/{taskId}/deliver")
    public ResponseEntity<ApiResponse<TaskSyncItem>> markDelivered(
            @PathVariable String taskId,
            @CurrentStudent String studentId) {
        TaskSyncItem updated = taskSyncServicePort.markTaskAsDelivered(taskId, studentId);
        return ResponseEntity.ok(ApiResponse.ok("Tarea marcada como entregada", updated));
    }
}
