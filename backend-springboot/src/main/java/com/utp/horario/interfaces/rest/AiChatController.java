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

    private final AiAssistantService aiAssistantServicePort;
    private final DailyQuotaService dailyQuotaServicePort;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final com.utp.horario.domain.model.repositories.IUtpPortalGateway utpPortalGatewayPort;
    private final com.utp.horario.application.service.tool.AcademicToolService academicToolService;
    private final com.utp.horario.infraestructure.security.SecurityIdentityResolver securityIdentityResolver;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatMessage>> chat(
            @CurrentStudent(required = false) String studentId,
            @RequestBody AiChatRequest request) {
        String codeCandidate = (studentId != null && !studentId.isBlank() && !"current-student".equalsIgnoreCase(studentId)) 
                ? studentId 
                : (request.getUserId() != null && !request.getUserId().isBlank() && !"current-student".equalsIgnoreCase(request.getUserId()) ? request.getUserId() : null);
        String effectiveStudentCode = academicToolService.resolveEffectiveStudentCode(codeCandidate);

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
            @org.springframework.web.bind.annotation.RequestParam(name = "studentId", required = false) String queryStudentId,
            @RequestBody com.utp.horario.interfaces.rest.dto.AiChatStreamRequest request) {
        
        String codeCandidate = null;
        if (studentId != null && !studentId.isBlank() && !"current-student".equalsIgnoreCase(studentId)) {
            codeCandidate = studentId;
        } else if (queryStudentId != null && !queryStudentId.isBlank() && !"current-student".equalsIgnoreCase(queryStudentId)) {
            codeCandidate = queryStudentId;
        } else if (request.getStudentCode() != null && !request.getStudentCode().isBlank() && !"current-student".equalsIgnoreCase(request.getStudentCode())) {
            codeCandidate = request.getStudentCode();
        } else if (request.getToken() != null && !request.getToken().isBlank()) {
            codeCandidate = securityIdentityResolver.extractStudentCodeFromToken(request.getToken());
        }

        String effectiveStudentCode = academicToolService.resolveEffectiveStudentCode(codeCandidate);

        // Registrar el token del alumno para que AcademicToolService pueda llamar a la API externa
        if (request.getToken() != null && !request.getToken().isBlank()) {
            utpPortalGatewayPort.registerStudentToken(effectiveStudentCode, request.getToken());
            log.debug("[AiChatController] 🔑 Token registrado para alumno [{}]", effectiveStudentCode);
        }
        return executeStreamEmitter(effectiveStudentCode, request.getMessage(), request.getModel(), request.getHistory());
    }

    @GetMapping(value = "/chat/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter streamChatGet(
            @CurrentStudent(required = false) String studentId,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String studentCode,
            @org.springframework.web.bind.annotation.RequestParam String message) {
        String codeCandidate = (studentId != null && !studentId.isBlank() && !"current-student".equalsIgnoreCase(studentId)) 
                ? studentId 
                : (studentCode != null && !studentCode.isBlank() && !"current-student".equalsIgnoreCase(studentCode) ? studentCode : null);
        String effectiveStudentCode = academicToolService.resolveEffectiveStudentCode(codeCandidate);
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

