package com.utp.horario.domain.model.repositories;

import com.utp.horario.domain.model.aggregate.Syllabus;

import java.util.List;
import java.util.Optional;

public interface ISyllabusRepository extends ICRUD<Syllabus, String> {
    Optional<Syllabus> findByCourseCode(String courseCode);

    /**
     * Resuelve un sílabo por su denominación de curso, insensible a mayúsculas, acentos y
     * signos de puntuación. Permite recuperar un sílabo persistido cuando el consumidor
     * consulta por el nombre visible de la asignatura en lugar de por su código de catálogo.
     *
     * @param courseName denominación de la asignatura
     * @return sílabo persistido, o {@link Optional#empty()} si no existe coincidencia
     */
    Optional<Syllabus> findByCourseName(String courseName);

    List<Syllabus> findAllByCourseCodes(List<String> courseCodes);
}
