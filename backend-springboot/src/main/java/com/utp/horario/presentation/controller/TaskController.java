package com.utp.horario.presentation.controller;

import com.utp.horario.domain.model.TaskSyncItem;
import com.utp.horario.domain.port.in.TaskSyncServicePort;
import com.utp.horario.presentation.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskSyncServicePort taskSyncServicePort;
    private final com.utp.horario.infrastructure.security.SecurityIdentityResolver identityResolver;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskSyncItem>>> getTasks(
            @org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String studentId) {
        String effectiveStudentId = identityResolver.resolveStudentCode(authHeader, studentId);
        List<TaskSyncItem> tasks = taskSyncServicePort.getTasksForStudent(effectiveStudentId);
        return ResponseEntity.ok(ApiResponse.ok(tasks));
    }

    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<List<TaskSyncItem>>> syncTasks(
            @org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authHeader,
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
            @org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String studentId) {
        String effectiveStudentId = identityResolver.resolveStudentCode(authHeader, studentId);
        TaskSyncItem updated = taskSyncServicePort.markTaskAsDelivered(taskId, effectiveStudentId);
        return ResponseEntity.ok(ApiResponse.ok("Tarea marcada como entregada", updated));
    }
}
