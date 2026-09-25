package com.utp.horario.domain.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class Course {
    private String id;
    private String code;
    private String name;
    private String section;
    private Integer credits;
    private String teacher;
    private String modality;
    private Integer weeklyHours;
    private List<ClassSession> sessions;
}
