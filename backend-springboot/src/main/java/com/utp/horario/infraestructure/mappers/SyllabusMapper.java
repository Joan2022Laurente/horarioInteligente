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
        try {
            if (entity.getRawJsonData() != null && !entity.getRawJsonData().isBlank()) {
                return objectMapper.readValue(entity.getRawJsonData(), Syllabus.class);
            }
        } catch (Exception e) {
            log.warn("Error parseando rawJsonData para silabo [{}]: {}", entity.getCourseCode(), e.getMessage());
        }
        return Syllabus.builder()
                .id(entity.getId())
                .courseCode(entity.getCourseCode())
                .courseName(entity.getCourseName())
                .semester(entity.getSemester())
                .credits(entity.getCredits())
                .modality(entity.getModality())
                .formula(entity.getFormula())
                .build();
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

