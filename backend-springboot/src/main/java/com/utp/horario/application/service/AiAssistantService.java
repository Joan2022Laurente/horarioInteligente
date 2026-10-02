package com.utp.horario.application.service;

import com.utp.horario.domain.model.value_objets.AiChatMessage;
import com.utp.horario.domain.model.value_objets.ScheduleInterval;
import com.utp.horario.domain.model.aggregate.Syllabus;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public interface AiAssistantService {
    AiChatMessage processUserQuery(
        String userIdentifier,
        String message,
        ScheduleInterval schedule,
        Map<String, Syllabus> syllabi
    );

    default AiChatMessage processUserQuery(
        String userIdentifier,
        String message,
        ScheduleInterval schedule,
        Map<String, Syllabus> syllabi,
        String requestedModel
    ) {
        return processUserQuery(userIdentifier, message, schedule, syllabi, requestedModel, null);
    }

    default AiChatMessage processUserQuery(
        String userIdentifier,
        String message,
        ScheduleInterval schedule,
        Map<String, Syllabus> syllabi,
        String requestedModel,
        List<Map<String, String>> history
    ) {
        return processUserQuery(userIdentifier, message, schedule, syllabi);
    }

    default void streamProcessUserQuery(
            String studentCode,
            String message,
            String requestedModel,
            List<Map<String, String>> history,
            Consumer<String> onToken,
            Consumer<Map<String, Object>> onToolEvent,
            Runnable onDone,
            Consumer<Throwable> onError) {
        try {
            AiChatMessage result = processUserQuery(studentCode, message, null, null, requestedModel, history);
            String content = result.getContent() != null ? result.getContent() : "";
            if (!content.isBlank()) onToken.accept(content);
            onDone.run();
        } catch (Exception e) {
            onError.accept(e);
        }
    }
}
