package com.utp.horario.infrastructure.adapters;

import com.utp.horario.domain.model.aggregate.StudentNetworkingProfile;
import com.utp.horario.domain.model.repositories.INetworkingProfileRepository;
import com.utp.horario.infrastructure.entities.StudentNetworkingProfileEntity;
import com.utp.horario.infrastructure.mappers.NetworkingProfileMapper;
import com.utp.horario.infrastructure.repositories.JPAStudentNetworkingProfileRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Adaptador de persistencia de Perfiles de Networking (Fase 1.0).
 * La exclusión del consultante y de perfiles ghost se ejecuta en la consulta
 * derivada de base de datos; el re-filtro con {@code isEligibleForMatching()}
 * garantiza el invariante del agregado aunque la fila llegue en memoria.
 */
@Repository
public class NetworkingProfileRepositoryAdapter implements INetworkingProfileRepository {

    private final JPAStudentNetworkingProfileRepository jpa;
    private final NetworkingProfileMapper mapper;

    public NetworkingProfileRepositoryAdapter(JPAStudentNetworkingProfileRepository jpa,
                                              NetworkingProfileMapper mapper) {
        this.jpa = jpa;
        this.mapper = mapper;
    }

    @Override
    public StudentNetworkingProfile save(StudentNetworkingProfile profile) {
        return mapper.toDomain(jpa.save(mapper.toEntity(profile)));
    }

    @Override
    public Optional<StudentNetworkingProfile> findById(String studentCode) {
        return jpa.findById(studentCode).map(mapper::toDomain);
    }

    @Override
    public StudentNetworkingProfile update(StudentNetworkingProfile profile) {
        return save(profile);
    }

    @Override
    public List<StudentNetworkingProfile> list() {
        return jpa.findAll().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Boolean delete(String studentCode) {
        if (jpa.existsById(studentCode)) {
            jpa.deleteById(studentCode);
            return true;
        }
        return false;
    }

    @Override
    public List<StudentNetworkingProfile> findEligibleCandidates(String excludeStudentCode, String campus) {
        String exclude = (excludeStudentCode == null || excludeStudentCode.isBlank()) ? null : excludeStudentCode;
        if (exclude == null) {
            // Camino defensivo: sin identidad autenticada a excluir no se entregan
            // perfiles de terceros (la capa de aplicación siempre provee el código
            // del consultante desde el token JWT).
            return List.of();
        }
        String site = (campus == null || campus.isBlank()) ? null : campus;
        List<StudentNetworkingProfileEntity> rows = (site != null)
                ? jpa.findByCampusAndGhostModeFalseAndStudentCodeNot(site, exclude)
                : jpa.findByGhostModeFalseAndStudentCodeNot(exclude);
        return rows.stream()
                .map(mapper::toDomain)
                .filter(StudentNetworkingProfile::isEligibleForMatching)
                .toList();
    }
}
