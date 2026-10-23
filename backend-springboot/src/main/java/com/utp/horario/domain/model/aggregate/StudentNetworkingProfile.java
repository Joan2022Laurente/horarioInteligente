package com.utp.horario.domain.model.aggregate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Agregado raíz que representa el Perfil de Networking y Colaboración de un Estudiante.
 * Almacena las horas libres (free windows), cursos matriculados, habilidades y preferencias
 * para el cálculo de compatibilidad del Matching Dual multidimensional.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentNetworkingProfile {
    private String studentCode;
    private String fullName;
    private String avatarLetter;
    private String career;
    private String campus;
    private Integer cycle;
    private String program;
    private String enrolledCoursesJson;
    private String freeWindowsJson;
    private String skillsJson;
    private String matchIntent;
    private String contactChannelsJson;
    private boolean ghostMode;
    private LocalDateTime updatedAt;

    public boolean isEligibleForMatching() {
        return !this.ghostMode && this.studentCode != null && !this.studentCode.isBlank();
    }
}
