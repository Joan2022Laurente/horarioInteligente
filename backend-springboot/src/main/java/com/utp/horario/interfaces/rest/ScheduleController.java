package com.utp.horario.interfaces.rest;

import com.utp.horario.application.command.GenerateScheduleCommand;
import com.utp.horario.application.handle.GenerateScheduleCommandHandler;
import com.utp.horario.domain.model.value_objets.ScheduleInterval;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.infraestructure.security.CurrentStudent;
import com.utp.horario.infraestructure.security.SecurityIdentityResolver;
import com.utp.horario.interfaces.rest.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/schedule", "/api/v1/schedule"})
@RequiredArgsConstructor
public class ScheduleController {

    private final GenerateScheduleCommandHandler scheduleCommandHandler;
    private final SecurityIdentityResolver identityResolver;
    private final IUtpPortalGateway utpPortalGatewayPort;

    @GetMapping
    public ResponseEntity<ApiResponse<ScheduleInterval>> getSchedule(
            @CurrentStudent String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(defaultValue = "2026 - Ciclo 2 Agosto") String period) {
        String token = identityResolver.extractBearerToken(authHeader);
        if (token != null && !token.isBlank() && studentId != null) {
            utpPortalGatewayPort.registerStudentToken(studentId, token);
        }
        ScheduleInterval schedule = scheduleCommandHandler.getStudentSchedule(studentId, period, token);
        return ResponseEntity.ok(ApiResponse.ok(schedule));
    }

    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<ScheduleInterval>> syncSchedule(
            @CurrentStudent String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String token,
            @RequestParam(defaultValue = "2026 - Ciclo 2 Agosto") String period) {
        String effectiveToken = (token != null && !token.isBlank()) ? token : identityResolver.extractBearerToken(authHeader);
        if (effectiveToken != null && !effectiveToken.isBlank() && studentId != null) {
            utpPortalGatewayPort.registerStudentToken(studentId, effectiveToken);
        }
        GenerateScheduleCommand command = GenerateScheduleCommand.builder()
                .studentId(studentId)
                .period(period)
                .token(effectiveToken)
                .build();
        ScheduleInterval synced = scheduleCommandHandler.syncScheduleFromUtp(command.getStudentId(), command.getToken(), command.getPeriod());
        return ResponseEntity.ok(ApiResponse.ok("Horario sincronizado con UTP", synced));
    }

    @GetMapping(value = "/export.ics", produces = "text/calendar; charset=utf-8")
    public ResponseEntity<String> exportIcs(
            @CurrentStudent(required = false) String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String token,
            @RequestParam(defaultValue = "2026 - Ciclo 2 Agosto") String period) {
        String effectiveToken = (token != null && !token.isBlank()) ? token : identityResolver.extractBearerToken(authHeader);
        if (effectiveToken != null && !effectiveToken.isBlank() && studentId != null) {
            utpPortalGatewayPort.registerStudentToken(studentId, effectiveToken);
        }
        String icsContent = utpPortalGatewayPort.exportCalendarIcs(effectiveToken, period);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"horario_utp.ics\"")
                .body(icsContent);
    }
}
