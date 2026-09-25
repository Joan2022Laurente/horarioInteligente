package com.utp.horario.domain.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ClassSession {
    private String id;
    private String courseCode;
    private String courseName;
    private String section;
    private String classroom;
    private String building;
    private String teacher;
    private String modality; // P (Presencial), R (Remoto), V (Virtual)
    private LocalDateTime startAt;
    private LocalDateTime finishAt;
    private String zoomLink;
    private String floor;
    private String environmentType;
    private String classLink;

    @JsonProperty("startAt")
    public void setStartAtRaw(Object raw) {
        this.startAt = parseDateTimeSafely(raw);
    }

    @JsonProperty("finishAt")
    public void setFinishAtRaw(Object raw) {
        this.finishAt = parseDateTimeSafely(raw);
    }

    public static LocalDateTime parseDateTimeSafely(Object raw) {
        if (raw == null) return null;
        if (raw instanceof LocalDateTime ldt) return ldt;
        String str = raw.toString().trim();
        if (str.isBlank()) return null;
        try {
            return LocalDateTime.parse(str);
        } catch (Exception e1) {
            try {
                return OffsetDateTime.parse(str).toLocalDateTime();
            } catch (Exception e2) {
                try {
                    return ZonedDateTime.parse(str).toLocalDateTime();
                } catch (Exception e3) {
                    try {
                        return LocalDate.parse(str).atStartOfDay();
                    } catch (Exception e4) {
                        return null;
                    }
                }
            }
        }
    }
}
