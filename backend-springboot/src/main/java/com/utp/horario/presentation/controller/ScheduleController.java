package com.utp.horario.presentation.controller;

import com.utp.horario.domain.model.ScheduleInterval;
import com.utp.horario.domain.port.in.ScheduleServicePort;
import com.utp.horario.presentation.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/schedule")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleServicePort scheduleServicePort;
    private final com.utp.horario.infrastructure.security.SecurityIdentityResolver identityResolver;

    @GetMapping
    public ResponseEntity<ApiResponse<ScheduleInterval>> getSchedule(
            @org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String studentId,
            @RequestParam(defaultValue = "2026 - Ciclo 2 Agosto") String period) {
        String token = identityResolver.extractBearerToken(authHeader);
        String effectiveStudentId = identityResolver.resolveStudentCode(authHeader, studentId);
        ScheduleInterval schedule = scheduleServicePort.getStudentSchedule(effectiveStudentId, period, token);
        return ResponseEntity.ok(ApiResponse.ok(schedule));
    }

    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<ScheduleInterval>> syncSchedule(
            @org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String token,
            @RequestParam(required = false) String studentId,
            @RequestParam(defaultValue = "2026 - Ciclo 2 Agosto") String period) {
        String effectiveToken = (token != null && !token.isBlank()) ? token : identityResolver.extractBearerToken(authHeader);
        String effectiveStudentId = identityResolver.resolveStudentCode(authHeader, studentId);
        ScheduleInterval synced = scheduleServicePort.syncScheduleFromUtp(effectiveStudentId, effectiveToken, period);
        return ResponseEntity.ok(ApiResponse.ok("Horario sincronizado con UTP", synced));
    }
}
