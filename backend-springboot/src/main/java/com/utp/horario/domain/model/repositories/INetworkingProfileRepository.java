package com.utp.horario.domain.model.repositories;

import com.utp.horario.domain.model.aggregate.StudentNetworkingProfile;

import java.util.List;

/**
 * Contrato de persistencia (Puerto) para los Perfiles de Networking de estudiantes.
 * La regla de elegibilidad ({@code ghost_mode} desactivado, identidad presente y
 * nunca el estudiante excluido) es un invariante de dominio, no una decisión de
 * infraestructura.
 */
public interface INetworkingProfileRepository extends ICRUD<StudentNetworkingProfile, String> {

    /**
     * Candidatos reales para el Matching Dual: sin ghost mode y distinto del
     * estudiante consultante; {@code campus} vacío amplía a todas las sedes.
     */
    List<StudentNetworkingProfile> findEligibleCandidates(String excludeStudentCode, String campus);
}
