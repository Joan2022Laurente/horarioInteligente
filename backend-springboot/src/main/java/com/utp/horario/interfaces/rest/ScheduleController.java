package com.utp.horario.interfaces.rest;

import com.utp.horario.application.command.GenerateScheduleCommand;
import com.utp.horario.application.dtos.AcademicToolDto;
import com.utp.horario.application.handle.GenerateScheduleCommandHandler;
import com.utp.horario.application.service.StudentSessionService;
import com.utp.horario.application.service.tool.AcademicToolService;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import com.utp.horario.infrastructure.security.CurrentStudent;
import com.utp.horario.infrastructure.security.SecurityIdentityResolver;
import com.utp.horario.interfaces.rest.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "02. Horarios y Clases", description = "Endpoints de consulta de horario semestral, clases de hoy y clases restantes")
@RestController
@RequestMapping({"/schedule", "/api/v1/schedule"})
@RequiredArgsConstructor
public class ScheduleController {

    private final GenerateScheduleCommandHandler scheduleCommandHandler;
    private final SecurityIdentityResolver identityResolver;
    private final StudentSessionService sessionService;
    private final AcademicToolService academicToolService;

    @GetMapping("/today")
    public ResponseEntity<ApiResponse<AcademicToolDto.DayScheduleResult>> getTodaySchedule(
            @CurrentStudent(required = false) String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String date) {
        String effectiveStudentCode = identityResolver.resolveStudentCode(authHeader, null, studentId);
        AcademicToolDto.DayScheduleResult result = academicToolService.getTodaySchedule(effectiveStudentCode, date);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/remaining")
    public ResponseEntity<ApiResponse<AcademicToolDto.RemainingClassesTodayResult>> getRemainingClassesToday(
            @CurrentStudent(required = false) String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String time) {
        String effectiveStudentCode = identityResolver.resolveStudentCode(authHeader, null, studentId);
        AcademicToolDto.RemainingClassesTodayResult result = academicToolService.getRemainingClassesToday(effectiveStudentCode, date, time);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ScheduleInterval>> getSchedule(
            @CurrentStudent String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(defaultValue = "2026 - Ciclo 2 Agosto") String period) {
        String token = identityResolver.extractBearerToken(authHeader);
        ScheduleInterval schedule = scheduleCommandHandler.getStudentSchedule(studentId, period, token);
        return ResponseEntity.ok(ApiResponse.ok(schedule));
    }

    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<ScheduleInterval>> syncSchedule(
            @CurrentStudent String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(defaultValue = "2026 - Ciclo 2 Agosto") String period) {
        String effectiveToken = identityResolver.extractBearerToken(authHeader);
        GenerateScheduleCommand command = GenerateScheduleCommand.builder()
                .studentId(studentId)
                .period(period)
                .token(effectiveToken)
                .build();
        ScheduleInterval synced = scheduleCommandHandler.handle(command);
        return ResponseEntity.ok(ApiResponse.ok("Horario sincronizado con UTP", synced));
    }

    @PostMapping("/import")
    public ResponseEntity<ApiResponse<ScheduleInterval>> importSchedule(
            @CurrentStudent String studentId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @org.springframework.web.bind.annotation.RequestBody ScheduleInterval schedule) {
        String effectiveToken = identityResolver.extractBearerToken(authHeader);
        ScheduleInterval saved = scheduleCommandHandler.importSchedule(studentId, schedule);
        return ResponseEntity.ok(ApiResponse.ok("Horario importado y sincronizado exitosamente", saved));
    }
}
