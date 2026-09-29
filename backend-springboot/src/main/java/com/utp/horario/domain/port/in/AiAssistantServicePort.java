package com.utp.horario.domain.port.in;

import com.utp.horario.domain.model.AiChatMessage;
import com.utp.horario.domain.model.ScheduleInterval;
import com.utp.horario.domain.model.Syllabus;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public interface AiAssistantServicePort {
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

    /**
     * Streaming real token-by-token con ReAct loop.
     * onToken: cada token de texto del modelo conforme llega
     * onToolEvent: evento {name, args} cuando se invoca una herramienta
     * onDone: señal de fin
     * onError: excepción fatal
     */
    default void streamProcessUserQuery(
            String studentCode,
            String message,
            String requestedModel,
            List<Map<String, String>> history,
            Consumer<String> onToken,
            Consumer<Map<String, Object>> onToolEvent,
            Runnable onDone,
            Consumer<Throwable> onError) {
        // Fallback: delegar a processUserQuery no-streaming
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

