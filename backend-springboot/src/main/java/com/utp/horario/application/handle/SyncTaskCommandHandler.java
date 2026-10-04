package com.utp.horario.application.handle;

import com.utp.horario.application.assembler.TaskAssembler;
import com.utp.horario.application.command.SyncTaskCommand;
import com.utp.horario.application.dtos.TaskDto;
import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import com.utp.horario.domain.model.repositories.ITaskSyncRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SyncTaskCommandHandler {

    private final ITaskSyncRepository repository;
    private final IUtpPortalGateway utpPortalGateway;
    private final TaskAssembler assembler;

    public List<TaskSyncItem> handle(SyncTaskCommand command) {
        return syncTasksFromUtp(command.getStudentId(), command.getToken(), command.getSectionId());
    }

    public List<TaskDto> handleAsDto(SyncTaskCommand command) {
        List<TaskSyncItem> items = handle(command);
        return items.stream().map(assembler::toDto).toList();
    }

    public List<TaskSyncItem> getTasksForStudent(String studentId) {
        if (studentId == null || studentId.isBlank() || "current-student".equalsIgnoreCase(studentId)) {
            return List.of();
        }
        return repository.findByStudentId(studentId);
    }

    public List<TaskSyncItem> syncTasksFromUtp(String studentId, String token, String sectionId) {
        List<TaskSyncItem> fetched = utpPortalGateway.fetchTasks(token, sectionId);
        if (fetched != null && studentId != null && !studentId.isBlank()) {
            for (TaskSyncItem item : fetched) {
                item.setStudentId(studentId);
            }
        }
        return repository.saveAll(fetched);
    }

    public List<TaskSyncItem> syncTasksFromUtp(String token, String sectionId) {
        return syncTasksFromUtp(null, token, sectionId);
    }

    public TaskSyncItem markTaskAsDelivered(String taskId, String studentId) {
        TaskSyncItem item = repository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Tarea no encontrada: " + taskId));

        // Control de acceso y aislamiento de datos: el estudiante solo puede modificar sus propias tareas
        if (item.getStudentId() != null && !item.getStudentId().isBlank()
                && studentId != null && !studentId.isBlank()
                && !item.getStudentId().equalsIgnoreCase(studentId)
                && !"current-student".equalsIgnoreCase(item.getStudentId())) {
            throw new SecurityException("Acceso denegado: No tienes autorización para modificar tareas de otro estudiante");
        }

        String effectiveStudentId = (item.getStudentId() != null && !"current-student".equalsIgnoreCase(item.getStudentId()))
                ? item.getStudentId()
                : studentId;

        TaskSyncItem updated = TaskSyncItem.builder()
                .id(item.getId())
                .studentId(effectiveStudentId)
                .courseName(item.getCourseName())
                .sectionId(item.getSectionId())
                .homeworkId(item.getHomeworkId())
                .title(item.getTitle())
                .type(item.getType())
                .week(item.getWeek())
                .homeworkStatus("DELIVERED")
                .assignmentProgress("FINISHED")
                .dueDate(item.getDueDate())
                .deliveredDate(LocalDateTime.now())
                .maxScore(item.getMaxScore())
                .score(item.getScore())
                .isDelivered(true)
                .courseCode(item.getCourseCode())
                .syllabusCorrelation(item.getSyllabusCorrelation())
                .build();

        return repository.save(updated);
    }
}
