package com.utp.horario.interfaces.rest.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO de la frontera REST para Mesas de Estudio (Study Beacons). Los nombres JSON
 * siguen exactamente el contrato {@code StudyBeaconRow} del frontend Angular.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StudyBeaconDto {

    private String id;

    @JsonProperty("host_id")
    private String hostId;

    @JsonProperty("host_name")
    private String hostName;

    @JsonProperty("host_avatar")
    private String hostAvatar;

    private String campus;

    @JsonProperty("location_name")
    private String locationName;

    @JsonProperty("course_name")
    private String courseName;

    @JsonProperty("section_code")
    private String sectionCode;

    private String objective;

    @JsonProperty("max_collaborators")
    private int maxCollaborators;

    @JsonProperty("current_collaborators")
    private int currentCollaborators;

    private String status;

    @JsonProperty("expires_at")
    private LocalDateTime expiresAt;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;
}
