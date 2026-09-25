package com.utp.horario.presentation.controller;

import com.utp.horario.domain.model.AiChatMessage;
import com.utp.horario.domain.model.DailyQuotaStatus;
import com.utp.horario.domain.port.in.AiAssistantServicePort;
import com.utp.horario.domain.port.in.DailyQuotaServicePort;
import com.utp.horario.infrastructure.security.CurrentStudent;
import com.utp.horario.presentation.dto.AiChatRequest;
import com.utp.horario.presentation.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiAssistantServicePort aiAssistantServicePort;
    private final DailyQuotaServicePort dailyQuotaServicePort;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatMessage>> chat(
            @CurrentStudent(required = false) String studentId,
            @RequestBody AiChatRequest request) {
        String effectiveUserId = (studentId != null && !studentId.isBlank()) 
                ? studentId 
                : (request.getUserId() != null && !request.getUserId().isBlank() ? request.getUserId() : "anonymous_user");

        AiChatMessage response = aiAssistantServicePort.processUserQuery(
                effectiveUserId,
                request.getMessage(),
                request.getSchedule(),
                request.getSyllabi(),
                request.getModel()
        );
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/quota")
    public ResponseEntity<ApiResponse<DailyQuotaStatus>> getQuota(
            @CurrentStudent(required = false) String studentId) {
        String effectiveUserId = (studentId != null && !studentId.isBlank()) ? studentId : "anonymous_user";
        DailyQuotaStatus status = dailyQuotaServicePort.checkQuota(effectiveUserId);
        return ResponseEntity.ok(ApiResponse.ok(status));
    }
}
