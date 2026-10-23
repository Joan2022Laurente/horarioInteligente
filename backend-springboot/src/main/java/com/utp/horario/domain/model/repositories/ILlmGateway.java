package com.utp.horario.domain.model.repositories;

import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.value_objects.AiChatMessage;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;

import java.util.Map;

public interface ILlmGateway {
    AiChatMessage queryModel(
            String prompt,
            ScheduleInterval schedule,
            Map<String, Syllabus> syllabi
    );

    default AiChatMessage queryModel(
            String prompt,
            ScheduleInterval schedule,
            Map<String, Syllabus> syllabi,
            String requestedModel
    ) {
        return queryModel(prompt, schedule, syllabi);
    }
}
