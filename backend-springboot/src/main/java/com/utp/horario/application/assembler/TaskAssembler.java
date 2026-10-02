package com.utp.horario.application.assembler;

import com.utp.horario.application.dtos.TaskDto;
import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import org.springframework.stereotype.Component;

@Component
public class TaskAssembler {

    public TaskDto toDto(TaskSyncItem item) {
        if (item == null) return null;
        return TaskDto.builder()
                .id(item.getId())
                .courseName(item.getCourseName())
                .sectionId(item.getSectionId())
                .homeworkId(item.getHomeworkId())
                .title(item.getTitle())
                .type(item.getType())
                .week(item.getWeek())
                .homeworkStatus(item.getHomeworkStatus())
                .assignmentProgress(item.getAssignmentProgress())
                .dueDate(item.getDueDate())
                .deliveredDate(item.getDeliveredDate())
                .maxScore(item.getMaxScore())
                .score(item.getScore())
                .isDelivered(item.getIsDelivered())
                .build();
    }
}
