package com.utp.horario.domain.model.repositories;

import com.utp.horario.domain.model.aggregate.StudentProfile;

import java.util.Optional;

public interface IStudentRepository extends ICRUD<StudentProfile, String> {
    Optional<StudentProfile> findByStudentCode(String studentCode);
    Optional<StudentProfile> findByEmail(String email);
}
