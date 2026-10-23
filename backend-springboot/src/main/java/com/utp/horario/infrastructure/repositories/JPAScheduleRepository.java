package com.utp.horario.infrastructure.repositories;

import com.utp.horario.infrastructure.entities.StudentScheduleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio JPA de horarios con consultas de recuperación anticipada
 * (Fase de Normalización): el catálogo de cursos se trae con {@code JOIN FETCH}
 * en un solo round-trip por horario. Las colecciones del grafo son
 * {@code Set}, por lo que el fetch join no dispara el
 * {@code MultipleBagFetchException} de Hibernate.
 */
@Repository
public interface JPAScheduleRepository extends JpaRepository<StudentScheduleEntity, String> {

    /** Horario de un alumno en un periodo, con su catálogo de cursos ya cargado. */
    @Query("SELECT DISTINCT s FROM StudentScheduleEntity s "
            + "LEFT JOIN FETCH s.courses "
            + "WHERE s.studentCode = :code AND s.periodName = :period")
    Optional<StudentScheduleEntity> findByStudentCodeAndPeriodNameWithCourses(@Param("code") String code,
                                                                              @Param("period") String period);

    /** Horario por id con su catálogo de cursos ya cargado. */
    @Query("SELECT DISTINCT s FROM StudentScheduleEntity s "
            + "LEFT JOIN FETCH s.courses "
            + "WHERE s.id = :id")
    Optional<StudentScheduleEntity> findWithCoursesById(@Param("id") String id);

    /** Todos los horarios con su catálogo (para listados sin problema N+1 de catálogo). */
    @Query("SELECT DISTINCT s FROM StudentScheduleEntity s LEFT JOIN FETCH s.courses")
    List<StudentScheduleEntity> findAllWithCourses();
}
