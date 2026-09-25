package com.utp.horario.presentation.controller;

import com.utp.horario.domain.model.AiChatMessage;
import com.utp.horario.domain.model.DailyQuotaStatus;
import com.utp.horario.domain.port.in.AiAssistantServicePort;
import com.utp.horario.domain.port.in.DailyQuotaServicePort;
import com.utp.horario.presentation.dto.AiChatRequest;
import com.utp.horario.presentation.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiAssistantServicePort aiAssistantServicePort;
    private final DailyQuotaServicePort dailyQuotaServicePort;
    private final com.utp.horario.infrastructure.security.SecurityIdentityResolver identityResolver;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatMessage>> chat(
            @org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody AiChatRequest request) {
        String effectiveUserId = request.getUserId();
        try {
            if (authHeader != null && !authHeader.isBlank()) {
                effectiveUserId = identityResolver.resolveStudentCode(authHeader, request.getUserId());
            }
        } catch (Exception e) {
            // Si no se puede resolver del token, usar el userId del body
        }
        if (effectiveUserId == null || effectiveUserId.isBlank()) {
            effectiveUserId = "anonymous_user";
        }

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
            @org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(defaultValue = "anonymous_user") String userId) {
        String effectiveUserId = userId;
        try {
            if (authHeader != null && !authHeader.isBlank()) {
                effectiveUserId = identityResolver.resolveStudentCode(authHeader, userId);
            }
        } catch (Exception e) {
            // fallback
        }
        DailyQuotaStatus status = dailyQuotaServicePort.checkQuota(effectiveUserId);
        return ResponseEntity.ok(ApiResponse.ok(status));
    }
}
