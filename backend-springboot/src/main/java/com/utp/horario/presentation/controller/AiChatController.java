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
        String effectiveStudentCode = (studentId != null && !studentId.isBlank()) 
                ? studentId 
                : (request.getUserId() != null && !request.getUserId().isBlank() ? request.getUserId() : "current-student");

        AiChatMessage response = aiAssistantServicePort.processUserQuery(
                effectiveStudentCode,
                request.getMessage(),
                null,
                null,
                request.getModel()
        );
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping(value = "/chat/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter streamChat(
            @CurrentStudent(required = false) String studentId,
            @org.springframework.web.bind.annotation.RequestParam String message) {
        String effectiveStudentCode = (studentId != null && !studentId.isBlank()) ? studentId : "current-student";
        var emitter = new org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter(60000L);

        // Ejecutar de forma asíncrona: emitir eventos SSE
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                // 1. Invocar al orquestador de agente
                AiChatMessage response = aiAssistantServicePort.processUserQuery(
                        effectiveStudentCode,
                        message,
                        null,
                        null
                );

                // 2. Si se usaron herramientas, emitir evento con las tools
                if (response.getMetadata() != null) {
                    @SuppressWarnings("unchecked")
                    java.util.List<String> tools = (java.util.List<String>) response.getMetadata().get("toolsUsed");
                    if (tools != null && !tools.isEmpty()) {
                        for (String t : tools) {
                            emitter.send("event: tool\ndata: " + t + "\n\n");
                        }
                    }
                }

                // 3. Emitir el contenido palabra por palabra para streaming ultra fluido
                String content = response.getContent() != null ? response.getContent() : "";
                String[] words = content.split(" ");
                for (int i = 0; i < words.length; i++) {
                    String space = (i < words.length - 1) ? " " : "";
                    emitter.send("event: delta\ndata: " + words[i] + space + "\n\n");
                    Thread.sleep(25); // Simulación de fluidez natural
                }

                emitter.send("event: done\ndata: [DONE]\n\n");
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });

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
