package com.utp.horario.domain.model.aggregate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Agregado raíz que representa una Mesa de Estudio activa en campus (Study Beacon).
 * Permite a estudiantes organizar sesiones de estudio colaborativo presencial o virtual.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyBeacon {
    private String id;
    private String hostId;             // Código del estudiante anfitrión (ej. U23307609)
    private String hostName;           // Nombre del anfitrión
    private String hostAvatar;         // Letra o avatar del anfitrión
    private String campus;             // Sede (ej. Lima Centro)
    private String locationName;       // Punto específico (ej. Torre A - Piso 8)
    private String courseName;         // Asignatura (ej. Desarrollo Web Integrado)
    private String sectionCode;        // Sección opcional
    private String objective;          // Meta de la sesión (ej. Resolver laboratorio Spring Boot)
    private int maxCollaborators;      // Capacidad máxima (ej. 4)
    private int currentCollaborators;  // Integrantes actuales (incluyendo el host)
    private String status;             // 'ACTIVE' | 'FULL' | 'EXPIRED' | 'CANCELLED'
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;

    /**
     * Une a un nuevo colaborador a la mesa si hay aforo disponible.
     * @return true si se unió con éxito, false si ya estaba llena o no activa.
     */
    public boolean join() {
        if (!"ACTIVE".equalsIgnoreCase(this.status)) {
            return false;
        }
        if (this.currentCollaborators >= this.maxCollaborators) {
            this.status = "FULL";
            return false;
        }
        this.currentCollaborators++;
        if (this.currentCollaborators >= this.maxCollaborators) {
            this.status = "FULL";
        }
        return true;
    }

    public void cancel() {
        this.status = "CANCELLED";
    }
}
