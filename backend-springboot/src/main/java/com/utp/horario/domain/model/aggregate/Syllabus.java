package com.utp.horario.domain.model.aggregate;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.utp.horario.domain.model.value_objets.SyllabusEvaluation;
import com.utp.horario.domain.model.value_objets.SyllabusWeeklySession;
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
public class Syllabus {
    private String id;
    private String courseCode;
    private String courseName;
    private String semester;
    private Integer credits;
    private String modality;
    private Integer weeklyHours;
    private List<String> careers;
    private String learningGoal;
    private String formula;
    private List<SyllabusEvaluation> evaluations;
    private List<String> rules;
    private Integer maxSimilarityPercent;
    private String aiPolicy;
    private List<SyllabusWeeklySession> weeklySchedule;

    @JsonProperty("generalInfo")
    private void unpackGeneralInfo(JsonNode generalInfo) {
        if (generalInfo != null) {
            if (generalInfo.has("courseCode") && !generalInfo.get("courseCode").isNull()) {
                this.courseCode = generalInfo.get("courseCode").asText();
            }
            if (generalInfo.has("courseName") && !generalInfo.get("courseName").isNull()) {
                this.courseName = generalInfo.get("courseName").asText();
            }
            if (generalInfo.has("credits") && !generalInfo.get("credits").isNull()) {
                this.credits = generalInfo.get("credits").asInt();
            }
            if (generalInfo.has("modality") && !generalInfo.get("modality").isNull()) {
                this.modality = generalInfo.get("modality").asText();
            }
        }
    }

    /**
     * Regla de negocio de honestidad de datos: un sílabo solo es presentable —o
     * persistible— como oficial si trae contenido curricular verificable: fórmula de
     * evaluación y cronograma semanal no vacíos.
     *
     * <p>"Existe un objeto" no es lo mismo que "el objeto sirve": cualquier consumo
     * (REST, agente IA, persistencia) debe validar esta regla en lugar de aceptar un
     * objeto vacío o fabricado presentado como sílabo oficial.</p>
     */
    public boolean isComplete() {
        return formula != null && !formula.isBlank()
                && weeklySchedule != null && !weeklySchedule.isEmpty();
    }
}
