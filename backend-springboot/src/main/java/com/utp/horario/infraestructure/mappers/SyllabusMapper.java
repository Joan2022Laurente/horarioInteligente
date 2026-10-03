package com.utp.horario.infraestructure.mappers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.infraestructure.entities.SyllabusEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SyllabusMapper {

    private final ObjectMapper objectMapper;

    public Syllabus toDomain(SyllabusEntity entity) {
        if (entity == null) return null;
        Syllabus domain = null;
        try {
            if (entity.getRawJsonData() != null && !entity.getRawJsonData().isBlank()) {
                domain = objectMapper.readValue(entity.getRawJsonData(), Syllabus.class);
            }
        } catch (Exception e) {
            log.warn("Error parseando rawJsonData para silabo [{}]: {}", entity.getCourseCode(), e.getMessage());
        }

        if (domain == null) {
            domain = Syllabus.builder().build();
        }
        if (domain.getId() == null) domain.setId(entity.getId());
        if (domain.getCourseCode() == null) domain.setCourseCode(entity.getCourseCode());
        if (domain.getCourseName() == null) domain.setCourseName(entity.getCourseName());
        if (domain.getSemester() == null) domain.setSemester(entity.getSemester());
        if (domain.getCredits() == null) domain.setCredits(entity.getCredits());
        if (domain.getModality() == null) domain.setModality(entity.getModality());
        if (domain.getFormula() == null) domain.setFormula(entity.getFormula());

        return domain;
    }

    public SyllabusEntity toEntity(Syllabus syllabus) {
        if (syllabus == null) return null;
        String json = null;
        try {
            json = objectMapper.writeValueAsString(syllabus);
        } catch (Exception e) {
            log.warn("Error serializando silabo [{}]: {}", syllabus.getCourseCode(), e.getMessage());
        }
        return SyllabusEntity.builder()
                .id(syllabus.getId())
                .courseCode(syllabus.getCourseCode())
                .courseName(syllabus.getCourseName())
                .semester(syllabus.getSemester())
                .credits(syllabus.getCredits())
                .modality(syllabus.getModality())
                .formula(syllabus.getFormula())
                .rawJsonData(json)
                .build();
    }
}

