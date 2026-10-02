package com.utp.horario.domain.model.repositories;

import com.utp.horario.domain.model.aggregate.Syllabus;

import java.util.List;
import java.util.Optional;

public interface ISyllabusRepository extends ICRUD<Syllabus, String> {
    Optional<Syllabus> findByCourseCode(String courseCode);
    List<Syllabus> findAllByCourseCodes(List<String> courseCodes);
}
