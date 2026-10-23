package com.utp.horario.infrastructure.adapters;

import com.utp.horario.domain.model.aggregate.StudyBeacon;
import com.utp.horario.domain.model.repositories.IStudyBeaconRepository;
import com.utp.horario.infrastructure.entities.StudyBeaconEntity;
import com.utp.horario.infrastructure.mappers.StudyBeaconMapper;
import com.utp.horario.infrastructure.repositories.JPAStudyBeaconRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Adaptador de persistencia de Mesas de Estudio (Fase 1.0: Networking).
 * Lecturas derivadas delegadas a índices de la tabla; sin N+1 por diseño
 * (una fila de {@code study_beacons} es un agregado completo).
 */
@Repository
public class StudyBeaconRepositoryAdapter implements IStudyBeaconRepository {

    private final JPAStudyBeaconRepository jpa;
    private final StudyBeaconMapper mapper;

    public StudyBeaconRepositoryAdapter(JPAStudyBeaconRepository jpa, StudyBeaconMapper mapper) {
        this.jpa = jpa;
        this.mapper = mapper;
    }

    @Override
    public StudyBeacon save(StudyBeacon beacon) {
        return mapper.toDomain(jpa.save(mapper.toEntity(beacon)));
    }

    @Override
    public Optional<StudyBeacon> findById(String id) {
        return jpa.findById(id).map(mapper::toDomain);
    }

    @Override
    public StudyBeacon update(StudyBeacon beacon) {
        return save(beacon);
    }

    @Override
    public List<StudyBeacon> list() {
        return jpa.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public Boolean delete(String id) {
        if (jpa.existsById(id)) {
            jpa.deleteById(id);
            return true;
        }
        return false;
    }

    @Override
    public List<StudyBeacon> findActiveByCampus(String campus) {
        List<StudyBeaconEntity> rows = (campus == null || campus.isBlank())
                ? jpa.findByStatusOrderByCreatedAtDesc("ACTIVE")
                : jpa.findByCampusAndStatusOrderByCreatedAtDesc(campus, "ACTIVE");
        return rows.stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<StudyBeacon> findByCourseName(String courseName) {
        if (courseName == null || courseName.isBlank()) {
            return List.of();
        }
        String needle = courseName.trim().toUpperCase();
        return jpa.findAll().stream()
                .filter(entity -> entity.getCourseName() != null
                        && entity.getCourseName().toUpperCase().contains(needle))
                .sorted((a, b) -> compareCreatedAtDesc(a.getCreatedAt(), b.getCreatedAt()))
                .map(mapper::toDomain)
                .toList();
    }

    private int compareCreatedAtDesc(LocalDateTime a, LocalDateTime b) {
        if (a == null && b == null) return 0;
        if (a == null) return 1;
        if (b == null) return -1;
        return b.compareTo(a);
    }
}
