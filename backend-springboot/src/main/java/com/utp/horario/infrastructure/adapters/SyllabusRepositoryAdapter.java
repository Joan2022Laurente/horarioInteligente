package com.utp.horario.infrastructure.adapters;

import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.repositories.ISyllabusRepository;
import com.utp.horario.infrastructure.entities.SyllabusEntity;
import com.utp.horario.infrastructure.mappers.SyllabusMapper;
import com.utp.horario.infrastructure.repositories.JPASyllabusRepository;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class SyllabusRepositoryAdapter implements ISyllabusRepository {

    private final JPASyllabusRepository jpa;
    private final SyllabusMapper mapper;

    public SyllabusRepositoryAdapter(JPASyllabusRepository jpa, SyllabusMapper mapper) {
        this.jpa = jpa;
        this.mapper = mapper;
    }

    @Override
    public Syllabus save(Syllabus syllabus) {
        try {
            SyllabusEntity entity = mapper.toEntity(syllabus);
            jpa.save(entity);
            return syllabus;
        } catch (Exception e) {
            throw new RuntimeException("Error persistiendo sílabo: " + syllabus.getCourseCode(), e);
        }
    }

    @Override
    public Optional<Syllabus> findByCourseCode(String courseCode) {
        if (courseCode == null || courseCode.isBlank()) return Optional.empty();
        String clean = courseCode.trim();
        List<SyllabusEntity> matches = jpa.searchSyllabus(clean);
        if (!matches.isEmpty()) {
            return Optional.ofNullable(mapper.toDomain(matches.get(0)));
        }
        return jpa.findById(clean).map(mapper::toDomain);
    }

    @Override
    public Optional<Syllabus> findByCourseName(String courseName) {
        if (courseName == null || courseName.isBlank()) return Optional.empty();
        String clean = courseName.trim();

        // 1. Coincidencia directa por nombre (la collation de MySQL ya es insensible a
        //    mayúsculas y acentos en el esquema de producción).
        Optional<SyllabusEntity> exact = jpa.findByCourseNameIgnoreCase(clean);
        if (exact.isPresent()) {
            return Optional.ofNullable(mapper.toDomain(exact.get()));
        }

        // 2. Coincidencia normalizada: ignora acentos, guiones y signos de puntuación, de
        //    modo que 'FORMACION PARA LA INVESTIGACION SISTEMAS' resuelva el sílabo
        //    'FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS'.
        String normalized = normalizeCourseName(clean);
        if (normalized.isEmpty()) return Optional.empty();

        for (SyllabusEntity entity : jpa.findAll()) {
            if (normalizeCourseName(entity.getCourseName()).equals(normalized)) {
                return Optional.ofNullable(mapper.toDomain(entity));
            }
        }
        return Optional.empty();
    }

    /**
     * Normaliza una denominación de asignatura para comparar sin acentos ni puntuación.
     */
    private String normalizeCourseName(String value) {
        if (value == null) return "";
        String nfd = java.text.Normalizer
                .normalize(value.trim().toUpperCase(), java.text.Normalizer.Form.NFD);
        return nfd.replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("[^A-Z0-9]", "");
    }

    @Override
    public List<Syllabus> findAllByCourseCodes(List<String> courseCodes) {
        List<Syllabus> list = new ArrayList<>();
        for (String code : courseCodes) {
            findByCourseCode(code).ifPresent(list::add);
        }
        return list;
    }

    @Override
    public Optional<Syllabus> findById(String id) {
        return jpa.findById(id).map(mapper::toDomain);
    }

    @Override
    public Syllabus update(Syllabus syllabus) {
        return save(syllabus);
    }

    @Override
    public List<Syllabus> list() {
        return jpa.findAll().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Boolean delete(String id) {
        if (jpa.existsById(id)) {
            jpa.deleteById(id);
            return true;
        }
        return false;
    }
}
