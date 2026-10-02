package com.utp.horario.infraestructure.mappers;

import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import com.utp.horario.infraestructure.entities.TaskSyncEntity;
import org.springframework.stereotype.Component;

@Component
public class TaskSyncMapper {

    public TaskSyncEntity toEntity(TaskSyncItem d) {
        if (d == null) return null;
        return TaskSyncEntity.builder()
                .id(d.getId())
                .studentId("current-student")
                .courseName(d.getCourseName())
                .sectionId(d.getSectionId())
                .homeworkId(d.getHomeworkId())
                .title(d.getTitle())
                .type(d.getType())
                .week(d.getWeek())
                .homeworkStatus(d.getHomeworkStatus())
                .assignmentProgress(d.getAssignmentProgress())
                .dueDate(d.getDueDate())
                .deliveredDate(d.getDeliveredDate())
                .maxScore(d.getMaxScore())
                .score(d.getScore())
                .isDelivered(d.getIsDelivered())
                .build();
    }

    public TaskSyncItem toDomain(TaskSyncEntity e) {
        if (e == null) return null;
        return TaskSyncItem.builder()
                .id(e.getId())
                .courseName(e.getCourseName())
                .sectionId(e.getSectionId())
                .homeworkId(e.getHomeworkId())
                .title(e.getTitle())
                .type(e.getType())
                .week(e.getWeek())
                .homeworkStatus(e.getHomeworkStatus())
                .assignmentProgress(e.getAssignmentProgress())
                .dueDate(e.getDueDate())
                .deliveredDate(e.getDeliveredDate())
                .maxScore(e.getMaxScore())
                .score(e.getScore())
                .isDelivered(e.getIsDelivered())
                .build();
    }
}

