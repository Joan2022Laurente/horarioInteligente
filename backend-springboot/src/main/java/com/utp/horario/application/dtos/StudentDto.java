package com.utp.horario.application.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDto {
    private String id;
    private String studentCode;
    private String fullName;
    private String email;
    private String career;
    private String campus;
    private Integer currentCycle;
    private String token;
    private List<String> enrolledCourseCodes;
}
