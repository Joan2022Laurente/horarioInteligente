package com.utp.horario.domain.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
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
public class StudentProfile {
    private String id;

    @JsonAlias({"student_code", "studentCode", "username"})
    private String studentCode;

    @JsonAlias({"full_name", "fullName", "name"})
    private String fullName;

    private String email;
    private String career;
    private String campus;

    private Integer currentCycle;
    private String token;
    private String refreshToken;
    private Integer expiresIn;
    private List<String> enrolledCourseCodes;

    @JsonSetter("currentCycle")
    public void setCurrentCycleRaw(Object raw) {
        this.currentCycle = parseCycle(raw);
    }

    @JsonSetter("relativeCycle")
    public void setRelativeCycleRaw(Object raw) {
        if (this.currentCycle == null || this.currentCycle <= 1) {
            this.currentCycle = parseCycle(raw);
        }
    }

    @JsonSetter("cycle")
    public void setCycleRaw(Object raw) {
        if (this.currentCycle == null || this.currentCycle <= 1) {
            this.currentCycle = parseCycle(raw);
        }
    }

    @JsonSetter("ciclo")
    public void setCicloRaw(Object raw) {
        if (this.currentCycle == null || this.currentCycle <= 1) {
            this.currentCycle = parseCycle(raw);
        }
    }

    @JsonProperty("name")
    public String getName() {
        return (fullName != null && !fullName.isBlank()) ? fullName : studentCode;
    }

    @JsonProperty("username")
    public String getUsername() {
        return (studentCode != null && !studentCode.isBlank()) ? studentCode : id;
    }

    private static Integer parseCycle(Object raw) {
        if (raw == null) return null;
        if (raw instanceof Number n) return n.intValue();
        String str = raw.toString().trim();
        try {
            return Integer.parseInt(str);
        } catch (Exception e) {
            return null;
        }
    }
}
