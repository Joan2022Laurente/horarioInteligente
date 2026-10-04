package com.utp.horario.domain.model.value_objets;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SyllabusCorrelation {
    private String courseCode;
    private String evaluationType;
    private Integer weightPercent;
    private String evaluationDescription;
    private Integer syllabusWeek;
    private String syllabusUnit;
    private String syllabusTopic;
    private Boolean isSyllabusMatched;
    private String syllabusUrl;
    private String syllabusMarkdownUrl;
}
