package com.utp.horario.domain.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScheduleInterval {
    private String id;

    @JsonAlias({"period_name", "periodName"})
    private String periodName;

    @JsonAlias({"week_number", "weekNumber"})
    private Integer weekNumber;

    @JsonAlias({"total_weeks", "totalWeeks"})
    private Integer totalWeeks;

    private LocalDate startDate;
    private LocalDate endDate;
    private List<Course> courses;

    @JsonAlias({"sessions", "classes"})
    private List<ClassSession> classes;
}
