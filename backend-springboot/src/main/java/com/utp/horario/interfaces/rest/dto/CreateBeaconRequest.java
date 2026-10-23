package com.utp.horario.interfaces.rest.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Petición de creación de una Mesa de Estudio (POST /networking/beacons).
 * La identidad del anfitrión NUNCA viaja por el cuerpo: la resuelve el token
 * JWT de sesión ({@code @CurrentStudent}); el resto de campos son editables.
 */
@Data
@NoArgsConstructor
public class CreateBeaconRequest {

    @JsonProperty("location_name")
    private String locationName;

    @JsonProperty("course_name")
    private String courseName;

    @JsonProperty("section_code")
    private String sectionCode;

    private String objective;

    @JsonProperty("campus")
    private String campus;

    @JsonProperty("max_collaborators")
    private Integer maxCollaborators;
}
