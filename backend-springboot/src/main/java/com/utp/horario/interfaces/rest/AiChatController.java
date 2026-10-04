package com.utp.horario.interfaces.rest;

import com.utp.horario.domain.model.value_objets.AiChatMessage;
import com.utp.horario.domain.model.value_objets.DailyQuotaStatus;
import com.utp.horario.application.service.AiAssistantService;
import com.utp.horario.application.service.DailyQuotaService;
import com.utp.horario.infraestructure.security.CurrentStudent;
import com.utp.horario.interfaces.rest.dto.AiChatRequest;
import com.utp.horario.interfaces.rest.dto.ApiResponse;
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

    private final AiAssistantService aiAssistantService;
    private final DailyQuotaService dailyQuotaService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final com.utp.horario.domain.model.repositories.IUtpPortalGateway utpPortalGateway;
    private final com.utp.horario.application.service.tool.AcademicToolService academicToolService;
    private final com.utp.horario.infraestructure.security.SecurityIdentityResolver securityIdentityResolver;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatMessage>> chat(
            @CurrentStudent(required = false) String studentId,
            @RequestBody AiChatRequest request) {
        String effectiveStudentCode = academicToolService.resolveEffectiveStudentCode(studentId);

        AiChatMessage response = aiAssistantService.processUserQuery(
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
            @RequestBody com.utp.horario.interfaces.rest.dto.AiChatStreamRequest request) {
        
        String codeCandidate = studentId;
        String tokenCandidate = null;
        if (codeCandidate == null || codeCandidate.isBlank() || "current-student".equalsIgnoreCase(codeCandidate)) {
            if (request.getToken() != null && !request.getToken().isBlank()) {
                codeCandidate = securityIdentityResolver.extractStudentCodeFromToken(request.getToken());
                tokenCandidate = request.getToken();
            }
        }

        String effectiveStudentCode = academicToolService.resolveEffectiveStudentCode(codeCandidate);

        // Registrar el token del alumno para que AcademicToolService pueda llamar a la API externa
        if (effectiveStudentCode != null && !effectiveStudentCode.isBlank()) {
            if (tokenCandidate != null && !tokenCandidate.isBlank()) {
                utpPortalGateway.registerStudentToken(effectiveStudentCode, tokenCandidate);
                log.debug("[AiChatController] 🔑 Token registrado para alumno [{}]", effectiveStudentCode);
            } else if (request.getToken() != null && !request.getToken().isBlank()) {
                utpPortalGateway.registerStudentToken(effectiveStudentCode, request.getToken());
                log.debug("[AiChatController] 🔑 Token registrado para alumno [{}]", effectiveStudentCode);
            }
        }
        return executeStreamEmitter(effectiveStudentCode, request.getMessage(), request.getModel(), request.getHistory());
    }

    @GetMapping(value = "/chat/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter streamChatGet(
            @CurrentStudent(required = false) String studentId,
            @org.springframework.web.bind.annotation.RequestParam String message) {
        String effectiveStudentCode = academicToolService.resolveEffectiveStudentCode(studentId);
        return executeStreamEmitter(effectiveStudentCode, message, null, null);
    }

    private org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter executeStreamEmitter(
            String effectiveStudentCode,
            String message,
            String model,
            java.util.List<java.util.Map<String, String>> history) {
        var emitter = new org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter(120000L);

        emitter.onTimeout(() -> {
            log.warn("[AiChatController] â±ï¸ Timeout en stream SSE");
            emitter.complete();
        });
        emitter.onError(e -> log.info("[AiChatController] â„¹ï¸ ConexiÃ³n SSE cerrada por cliente"));

        java.util.concurrent.CompletableFuture.runAsync(() ->
            aiAssistantService.streamProcessUserQuery(
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
                // onToolEvent: emitir actividad enriquecida y evento tool sanitizado
                toolEvt -> {
                    try {
                        String payload = objectMapper.writeValueAsString(toolEvt);
                        emitter.send("event: activity\ndata: " + payload + "\n\n");
                        if (toolEvt != null && toolEvt.containsKey("tool")) {
                            String legacyPayload = objectMapper.writeValueAsString(java.util.Map.of("name", toolEvt.get("tool")));
                            emitter.send("event: tool\ndata: " + legacyPayload + "\n\n");
                        }
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
        DailyQuotaStatus status = dailyQuotaService.checkQuota(effectiveUserId);
        return ResponseEntity.ok(ApiResponse.ok(status));
    }
}

