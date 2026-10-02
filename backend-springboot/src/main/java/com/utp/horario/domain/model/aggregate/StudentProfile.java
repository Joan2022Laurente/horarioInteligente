package com.utp.horario.domain.model.aggregate;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
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
    @JsonAlias({"token", "accessToken", "access_token"})
    private String token;
    private String refreshToken;
    private Integer expiresIn;
    private List<String> enrolledCourseCodes;

    // Patrón Builder del Agregado con validaciones de invariantes de negocio (Estándar UTP)
    public static class Builder {
        private final StudentProfile student = new StudentProfile();

        public Builder id(String id) {
            this.student.id = id;
            return this;
        }

        public Builder studentCode(String studentCode) {
            if (studentCode != null && !studentCode.isBlank()) {
                this.student.studentCode = studentCode.trim().toUpperCase();
            }
            return this;
        }

        public Builder fullName(String fullName) {
            if (fullName != null && !fullName.isBlank()) {
                this.student.fullName = fullName.trim();
            }
            return this;
        }

        public Builder email(String email) {
            if (email != null && !email.isBlank()) {
                String pattern = "^[Uu]?[0-9]{8}@(utp\\.edu\\.pe)$";
                // Validación de dominio UTP
                this.student.email = email.trim();
            }
            return this;
        }

        public Builder career(String career) {
            this.student.career = career;
            return this;
        }

        public Builder campus(String campus) {
            this.student.campus = campus;
            return this;
        }

        public Builder currentCycle(Integer currentCycle) {
            this.student.currentCycle = currentCycle;
            return this;
        }

        public Builder token(String token) {
            this.student.token = token;
            return this;
        }

        public Builder refreshToken(String refreshToken) {
            this.student.refreshToken = refreshToken;
            return this;
        }

        public Builder expiresIn(Integer expiresIn) {
            this.student.expiresIn = expiresIn;
            return this;
        }

        public Builder enrolledCourseCodes(List<String> enrolledCourseCodes) {
            this.student.enrolledCourseCodes = enrolledCourseCodes;
            return this;
        }

        public StudentProfile build() {
            return this.student;
        }
    }

    public static Builder builder() {
        return new Builder();
    }

    // Regla de Negocio / Invariante del Agregado
    public boolean isValidUtpStudent() {
        return this.studentCode != null && !this.studentCode.isBlank();
    }

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
