package com.utp.horario.presentation.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.utp.horario.domain.model.ScheduleInterval;
import com.utp.horario.domain.model.Syllabus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiChatRequest {
    private String message;
    @JsonAlias({"studentId", "user_id"})
    private String userId;

    @JsonAlias({"calendarData", "schedule"})
    private ScheduleInterval schedule;

    @JsonAlias({"syllabiData", "syllabi"})
    private Map<String, Syllabus> syllabi;

    private JsonNode liveContext;
    private JsonNode studentProfile;
    private String model;
}
