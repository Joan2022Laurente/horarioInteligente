package com.utp.horario.application.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDto {
    private String id;
    private String courseName;
    private String sectionId;
    private String homeworkId;
    private String title;
    private String type;
    private Integer week;
    private String homeworkStatus;
    private String assignmentProgress;
    private LocalDateTime dueDate;
    private LocalDateTime deliveredDate;
    private Double maxScore;
    private Double score;
    private Boolean isDelivered;
}
