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

    public List<TaskDto> handle(SyncTaskCommand command) {
        List<TaskSyncItem> items = syncTasksFromUtp(command.getToken(), command.getSectionId());
        return items.stream().map(assembler::toDto).toList();
    }

    public List<TaskSyncItem> getTasksForStudent(String studentId) {
        if (studentId == null || studentId.isBlank() || "current-student".equalsIgnoreCase(studentId)) {
            return List.of();
        }
        return repository.findByStudentId(studentId);
    }

    public List<TaskSyncItem> syncTasksFromUtp(String token, String sectionId) {
        List<TaskSyncItem> fetched = utpPortalGateway.fetchTasks(token, sectionId);
        return repository.saveAll(fetched);
    }

    public TaskSyncItem markTaskAsDelivered(String taskId, String studentId) {
        TaskSyncItem item = repository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Tarea no encontrada: " + taskId));

        TaskSyncItem updated = TaskSyncItem.builder()
                .id(item.getId())
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
                .build();

        return repository.save(updated);
    }
}
