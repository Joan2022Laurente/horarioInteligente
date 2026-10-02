package com.utp.horario.application.dtos;

import com.utp.horario.domain.model.value_objets.ClassSession;
import com.utp.horario.domain.model.value_objets.Course;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleDto {
    private String id;
    private String periodName;
    private Integer weekNumber;
    private Integer totalWeeks;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<Course> courses;
    private List<ClassSession> classes;
}
