package com.utp.horario.interfaces.rest.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * DTO de la frontera REST para el Perfil de Networking de un estudiante. Los
 * nombres JSON siguen exactamente el contrato {@code StudentNetworkingProfile}
 * del frontend, de modo que el Matching Dual se calcula sin remapear campos.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StudentNetworkingProfileDto {

    @JsonProperty("student_code")
    private String studentCode;

    @JsonProperty("full_name")
    private String fullName;

    @JsonProperty("avatar_letter")
    private String avatarLetter;

    private String career;

    private String campus;

    private Integer cycle;

    private String program;

    @JsonProperty("enrolled_courses")
    private List<String> enrolledCourses;

    @JsonProperty("free_windows")
    private List<FreeWindowDto> freeWindows;

    private List<String> skills;

    @JsonProperty("match_intent")
    private String matchIntent;

    @JsonProperty("contact_channels")
    private Map<String, String> contactChannels;

    @JsonProperty("ghost_mode")
    private boolean ghostMode;

    @JsonProperty("updated_at")
    private String updatedAt;
}
