package com.utp.horario.presentation.controller;

import com.utp.horario.domain.model.AiChatMessage;
import com.utp.horario.domain.model.DailyQuotaStatus;
import com.utp.horario.domain.port.in.AiAssistantServicePort;
import com.utp.horario.domain.port.in.DailyQuotaServicePort;
import com.utp.horario.infrastructure.security.CurrentStudent;
import com.utp.horario.presentation.dto.AiChatRequest;
import com.utp.horario.presentation.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping({"/ai", "/api/v1/ai"})
@RequiredArgsConstructor
public class AiChatController {

    private final AiAssistantServicePort aiAssistantServicePort;
    private final DailyQuotaServicePort dailyQuotaServicePort;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatMessage>> chat(
            @CurrentStudent(required = false) String studentId,
            @RequestBody AiChatRequest request) {
        String effectiveStudentCode = (studentId != null && !studentId.isBlank()) 
                ? studentId 
                : (request.getUserId() != null && !request.getUserId().isBlank() ? request.getUserId() : "current-student");

        AiChatMessage response = aiAssistantServicePort.processUserQuery(
                effectiveStudentCode,
                request.getMessage(),
                null,
                null,
                request.getModel(),
                request.getHistory()
        );
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping(value = "/chat/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter streamChatPost(
            @CurrentStudent(required = false) String studentId,
            @RequestBody com.utp.horario.presentation.dto.AiChatStreamRequest request) {
        String effectiveStudentCode = (studentId != null && !studentId.isBlank()) 
                ? studentId 
                : (request.getStudentCode() != null && !request.getStudentCode().isBlank() ? request.getStudentCode() : "current-student");
        return executeStreamEmitter(effectiveStudentCode, request.getMessage(), request.getModel(), request.getHistory());
    }

    @GetMapping(value = "/chat/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter streamChatGet(
            @CurrentStudent(required = false) String studentId,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String studentCode,
            @org.springframework.web.bind.annotation.RequestParam String message) {
        String effectiveStudentCode = (studentId != null && !studentId.isBlank()) 
                ? studentId 
                : (studentCode != null && !studentCode.isBlank() ? studentCode : "current-student");
        return executeStreamEmitter(effectiveStudentCode, message, null, null);
    }

    private org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter executeStreamEmitter(
            String effectiveStudentCode,
            String message,
            String model,
            java.util.List<java.util.Map<String, String>> history) {
        var emitter = new org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter(120000L);

        emitter.onTimeout(() -> {
            log.warn("[AiChatController] ⏱️ Timeout en stream SSE");
            emitter.complete();
        });
        emitter.onError(e -> log.info("[AiChatController] ℹ️ Conexión SSE cerrada por cliente"));

        java.util.concurrent.CompletableFuture.runAsync(() ->
            aiAssistantServicePort.streamProcessUserQuery(
                effectiveStudentCode,
                message,
                model,
                history,
                // onToken: emitir cada token conforme llega de OpenRouter
                token -> {
                    try {
                        String payload = objectMapper.writeValueAsString(java.util.Map.of("delta", token));
                        emitter.send("event: delta\ndata: " + payload + "\n\n");
                    } catch (Exception ex) {
                        log.debug("[AiChatController] Token drop (cliente desconectado): {}", ex.getMessage());
                    }
                },
                // onToolEvent: emitir nombre de herramienta tan pronto como se detecta
                toolEvt -> {
                    try {
                        String payload = objectMapper.writeValueAsString(toolEvt);
                        emitter.send("event: tool\ndata: " + payload + "\n\n");
                    } catch (Exception ex) {
                        log.debug("[AiChatController] Tool event drop: {}", ex.getMessage());
                    }
                },
                // onDone
                () -> {
                    try {
                        emitter.send("event: done\ndata: [DONE]\n\n");
                        emitter.complete();
                    } catch (Exception ex) {
                        log.debug("[AiChatController] Done drop: {}", ex.getMessage());
                    }
                },
                // onError
                err -> {
                    log.error("[AiChatController] Error en stream: {}", err.getMessage(), err);
                    emitter.completeWithError(err);
                }
            )
        );

        return emitter;
    }

    @GetMapping("/quota")
    public ResponseEntity<ApiResponse<DailyQuotaStatus>> getQuota(
            @CurrentStudent(required = false) String studentId) {
        String effectiveUserId = (studentId != null && !studentId.isBlank()) ? studentId : "anonymous_user";
        DailyQuotaStatus status = dailyQuotaServicePort.checkQuota(effectiveUserId);
        return ResponseEntity.ok(ApiResponse.ok(status));
    }
}
