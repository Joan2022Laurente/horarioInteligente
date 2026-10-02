package com.utp.horario.interfaces.rest.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiChatStreamRequest {
    private String message;

    @JsonAlias({"studentId", "user_id", "userId"})
    private String studentCode;

    /** Token de sesiÃ³n UTP del alumno. Necesario para llamar a la API externa (sÃ­labos, evaluaciones). */
    private String token;

    private String model;

    private List<Map<String, String>> history;
}

