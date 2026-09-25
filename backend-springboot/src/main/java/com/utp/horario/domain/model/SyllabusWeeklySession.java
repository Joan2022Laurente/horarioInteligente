package com.utp.horario.domain.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
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
public class SyllabusWeeklySession {
    private Integer week;
    private Integer session;
    private String unit;
    private String topic;
    private String activities;
    private String evaluation;

    @JsonProperty("topics")
    public void setTopicsRaw(JsonNode node) {
        if (node != null && node.isArray()) {
            StringBuilder sb = new StringBuilder();
            node.forEach(n -> {
                if (!sb.isEmpty()) sb.append(", ");
                sb.append(n.asText());
            });
            if (this.topic == null || this.topic.isBlank()) {
                this.topic = sb.toString();
            }
        }
    }

    @JsonProperty("topic")
    public void setTopicRaw(JsonNode node) {
        if (node != null) {
            if (node.isTextual()) {
                this.topic = node.asText();
            } else if (node.isArray()) {
                StringBuilder sb = new StringBuilder();
                node.forEach(n -> {
                    if (!sb.isEmpty()) sb.append(", ");
                    sb.append(n.asText());
                });
                this.topic = sb.toString();
            }
        }
    }

    @JsonProperty("activities")
    public void setActivitiesRaw(JsonNode node) {
        if (node != null) {
            if (node.isTextual()) {
                this.activities = node.asText();
            } else if (node.isArray()) {
                StringBuilder sb = new StringBuilder();
                node.forEach(n -> {
                    if (!sb.isEmpty()) sb.append(", ");
                    sb.append(n.asText());
                });
                this.activities = sb.toString();
            }
        }
    }
}
