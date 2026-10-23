package com.utp.horario.infrastructure.repositories;

import com.utp.horario.infrastructure.entities.SyllabusEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio JPA de sílabos oficiales con consultas de recuperación anticipada
 * (Fase de Normalización): evaluaciones y cronograma semanal se cargan en el MISMO
 * round-trip voluntario — ambas asociaciones son {@code Set}, por lo que el doble
 * JOIN FETCH es legal en Hibernate (producto cartesiano moderado por índices,
 * sin {@code MultipleBagFetchException}).
 */
@Repository
public interface JPASyllabusRepository extends JpaRepository<SyllabusEntity, String> {

    /** Sílabo por id con evaluaciones y semanas ya cargadas. */
    @Query("SELECT DISTINCT s FROM SyllabusEntity s "
            + "LEFT JOIN FETCH s.evaluations "
            + "LEFT JOIN FETCH s.weeklySessions "
            + "WHERE s.id = :id")
    Optional<SyllabusEntity> findWithRelationsById(@Param("id") String id);

    /** Sílabo por código de curso (insensible a mayúsculas) con relaciones cargadas. */
    @Query("SELECT DISTINCT s FROM SyllabusEntity s "
            + "LEFT JOIN FETCH s.evaluations "
            + "LEFT JOIN FETCH s.weeklySessions "
            + "WHERE UPPER(s.courseCode) = UPPER(:courseCode)")
    Optional<SyllabusEntity> findByCourseCodeIgnoreCaseWithRelations(@Param("courseCode") String courseCode);

    /** Sílabo por denominación (insensible a mayúsculas) con relaciones cargadas. */
    @Query("SELECT DISTINCT s FROM SyllabusEntity s "
            + "LEFT JOIN FETCH s.evaluations "
            + "LEFT JOIN FETCH s.weeklySessions "
            + "WHERE UPPER(s.courseName) = UPPER(:courseName)")
    Optional<SyllabusEntity> findByCourseNameIgnoreCaseWithRelations(@Param("courseName") String courseName);

    /** Búsqueda por código o denominación con relaciones cargadas. */
    @Query("SELECT DISTINCT s FROM SyllabusEntity s "
            + "LEFT JOIN FETCH s.evaluations "
            + "LEFT JOIN FETCH s.weeklySessions "
            + "WHERE UPPER(s.courseCode) = UPPER(:query) "
            + "OR UPPER(s.courseName) = UPPER(:query) "
            + "OR UPPER(s.courseName) LIKE UPPER(CONCAT('%', :query, '%'))")
    List<SyllabusEntity> searchSyllabusWithRelations(@Param("query") String query);

    /** Todos los sílabos con relaciones cargadas (evita N+1 en listados y barridos normalizados). */
    @Query("SELECT DISTINCT s FROM SyllabusEntity s "
            + "LEFT JOIN FETCH s.evaluations "
            + "LEFT JOIN FETCH s.weeklySessions")
    List<SyllabusEntity> findAllWithRelations();
}
