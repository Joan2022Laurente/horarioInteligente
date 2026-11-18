package com.utp.horario.application.service;

import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.repositories.ILlmGateway;
import com.utp.horario.domain.model.value_objects.AiChatMessage;
import com.utp.horario.domain.model.value_objects.DailyQuotaStatus;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiAssistantServiceImpl implements AiAssistantService {

    private final ILlmGateway llmGateway;
    private final DailyQuotaService dailyQuotaService;

    @Override
    public AiChatMessage processUserQuery(
            String userIdentifier,
            String message,
            ScheduleInterval schedule,
            Map<String, Syllabus> syllabi) {
        return processUserQuery(userIdentifier, message, schedule, syllabi, null);
    }

    @Override
    public AiChatMessage processUserQuery(
            String userIdentifier,
            String message,
            ScheduleInterval schedule,
            Map<String, Syllabus> syllabi,
            String requestedModel) {

        DailyQuotaStatus quota = dailyQuotaService.consumeQuota(userIdentifier);
        if (!quota.getAllowed()) {
            return AiChatMessage.builder()
                    .id(UUID.randomUUID().toString())
                    .role("assistant")
                    .content("Has alcanzado el límite de " + quota.getMax() + " consultas diarias. Tu cuota se reiniciará a las 00:00.")
                    .timestamp(LocalDateTime.now())
                    .suggestions(List.of())
                    .metadata(Map.of("rateLimitReached", true, "quota", quota))
                    .build();
        }

        try {
            return llmGateway.queryModel(message, schedule, syllabi, requestedModel);
        } catch (Exception e) {
            log.error("[AiAssistant] Servicio de IA no disponible: {}", e.getMessage());
            return AiChatMessage.builder()
                    .id(UUID.randomUUID().toString())
                    .role("assistant")
                    .content("El servicio de IA no está disponible temporalmente. Inténtalo de nuevo en unos minutos.")
                    .timestamp(LocalDateTime.now())
                    .suggestions(List.of())
                    .metadata(Map.of("serviceUnavailable", true))
                    .build();
        }
    }
}
