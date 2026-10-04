package com.utp.horario.infraestructure.mappers;

import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import com.utp.horario.domain.model.value_objets.SyllabusCorrelation;
import com.utp.horario.infraestructure.entities.TaskSyncEntity;
import org.springframework.stereotype.Component;

@Component
public class TaskSyncMapper {

    public TaskSyncEntity toEntity(TaskSyncItem d) {
        if (d == null) return null;
        String sid = (d.getStudentId() != null && !d.getStudentId().isBlank()) ? d.getStudentId() : "current-student";
        SyllabusCorrelation sc = d.getSyllabusCorrelation();
        String cCode = d.getCourseCode() != null && !d.getCourseCode().isBlank() 
                ? d.getCourseCode() 
                : (sc != null ? sc.getCourseCode() : null);

        return TaskSyncEntity.builder()
                .id(d.getId())
                .studentId(sid)
                .courseName(d.getCourseName())
                .courseCode(cCode)
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
                .evaluationType(sc != null ? sc.getEvaluationType() : null)
                .weightPercent(sc != null ? sc.getWeightPercent() : null)
                .evaluationDescription(sc != null ? sc.getEvaluationDescription() : null)
                .syllabusWeek(sc != null ? sc.getSyllabusWeek() : null)
                .syllabusUnit(sc != null ? sc.getSyllabusUnit() : null)
                .syllabusTopic(sc != null ? sc.getSyllabusTopic() : null)
                .isSyllabusMatched(sc != null ? sc.getIsSyllabusMatched() : null)
                .syllabusUrl(sc != null ? sc.getSyllabusUrl() : null)
                .syllabusMarkdownUrl(sc != null ? sc.getSyllabusMarkdownUrl() : null)
                .build();
    }

    public TaskSyncItem toDomain(TaskSyncEntity e) {
        if (e == null) return null;
        SyllabusCorrelation sc = null;
        if (e.getEvaluationType() != null || e.getSyllabusWeek() != null || e.getWeightPercent() != null || Boolean.TRUE.equals(e.getIsSyllabusMatched())) {
            sc = SyllabusCorrelation.builder()
                    .courseCode(e.getCourseCode())
                    .evaluationType(e.getEvaluationType())
                    .weightPercent(e.getWeightPercent())
                    .evaluationDescription(e.getEvaluationDescription())
                    .syllabusWeek(e.getSyllabusWeek())
                    .syllabusUnit(e.getSyllabusUnit())
                    .syllabusTopic(e.getSyllabusTopic())
                    .isSyllabusMatched(e.getIsSyllabusMatched())
                    .syllabusUrl(e.getSyllabusUrl())
                    .syllabusMarkdownUrl(e.getSyllabusMarkdownUrl())
                    .build();
        }

        return TaskSyncItem.builder()
                .id(e.getId())
                .studentId(e.getStudentId())
                .courseName(e.getCourseName())
                .courseCode(e.getCourseCode())
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
                .syllabusCorrelation(sc)
                .build();
    }
}

