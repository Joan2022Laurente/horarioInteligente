package com.utp.horario.infraestructure.adapters;

import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.repositories.ISyllabusRepository;
import com.utp.horario.infraestructure.entities.SyllabusEntity;
import com.utp.horario.infraestructure.mappers.SyllabusMapper;
import com.utp.horario.infraestructure.repositories.JPASyllabusRepository;
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
