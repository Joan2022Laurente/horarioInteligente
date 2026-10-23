package com.utp.horario.domain.model.repositories;

import com.utp.horario.domain.model.aggregate.StudyBeacon;

import java.util.List;

/**
 * Contrato de persistencia (Puerto) para las Mesas de Estudio activas en campus.
 * Pertenece al núcleo de dominio: solo agregados y tipos del propio modelo.
 */
public interface IStudyBeaconRepository extends ICRUD<StudyBeacon, String> {

    /** Mesas anunciables a estudiantes de una sede; {@code campus} nulo o vacío
     * amplía al listado global ordenado por creación. */
    List<StudyBeacon> findActiveByCampus(String campus);

    /** Búsqueda académica de mesas por asignatura (coincidencia parcial). */
    List<StudyBeacon> findByCourseName(String courseName);
}
