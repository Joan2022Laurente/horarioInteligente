package com.utp.horario.infrastructure.repositories;

import com.utp.horario.infrastructure.entities.StudentNetworkingProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Adaptador Spring Data para perfiles de networking. El filtro de elegibilidad
 * (ghost mode desactivado + exclusión del consultante) vive en la base de datos
 * para no transportar perfiles fantasma por la red.
 */
public interface JPAStudentNetworkingProfileRepository extends JpaRepository<StudentNetworkingProfileEntity, String> {

    List<StudentNetworkingProfileEntity> findByGhostModeFalseAndStudentCodeNot(String studentCode);

    List<StudentNetworkingProfileEntity> findByCampusAndGhostModeFalseAndStudentCodeNot(String campus, String studentCode);
}
