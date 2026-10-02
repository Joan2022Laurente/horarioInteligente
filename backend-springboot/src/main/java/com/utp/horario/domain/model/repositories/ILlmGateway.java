package com.utp.horario.domain.model.repositories;

import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.value_objets.AiChatMessage;
import com.utp.horario.domain.model.value_objets.ScheduleInterval;

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
