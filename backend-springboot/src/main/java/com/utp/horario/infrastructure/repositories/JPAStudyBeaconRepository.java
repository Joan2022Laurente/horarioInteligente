package com.utp.horario.infrastructure.repositories;

import com.utp.horario.infrastructure.entities.StudyBeaconEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Adaptador Spring Data para mesas de estudio. Consultas derivadas con
 * ordenación por creación: sin bag fetch (agregado sin colecciones hijas)
 * y sin riesgo de N+1 (una fila = un agregado completo).
 */
public interface JPAStudyBeaconRepository extends JpaRepository<StudyBeaconEntity, String> {

    List<StudyBeaconEntity> findByStatusOrderByCreatedAtDesc(String status);

    List<StudyBeaconEntity> findByCampusAndStatusOrderByCreatedAtDesc(String campus, String status);
}
