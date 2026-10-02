package com.utp.horario.application.assembler;

import com.utp.horario.application.command.AuthenticateStudentCommand;
import com.utp.horario.application.dtos.StudentDto;
import com.utp.horario.domain.model.aggregate.StudentProfile;
import org.springframework.stereotype.Component;

import java.util.Objects;

@Component
public class StudentAssembler {

    public StudentProfile toDomain(AuthenticateStudentCommand command) {
        Objects.requireNonNull(command, "Command cannot be null");
        return StudentProfile.builder()
                .studentCode(command.getUsername())
                .build();
    }

    public StudentDto toDto(StudentProfile student) {
        if (student == null) return null;
        return StudentDto.builder()
                .id(student.getId())
                .studentCode(student.getStudentCode())
                .fullName(student.getFullName())
                .email(student.getEmail())
                .career(student.getCareer())
                .campus(student.getCampus())
                .currentCycle(student.getCurrentCycle())
                .token(student.getToken())
                .enrolledCourseCodes(student.getEnrolledCourseCodes())
                .build();
    }
}
