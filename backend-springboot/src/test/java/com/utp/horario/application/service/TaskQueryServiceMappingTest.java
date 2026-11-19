package com.utp.horario.application.service;

import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import com.utp.horario.domain.model.repositories.ITaskSyncRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.domain.model.value_objects.UpcomingEvaluationDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/** Verifica que el mapeo del portal preserve TODOS los campos institucionales. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TaskQueryServiceMappingTest {

    @Mock private ITaskSyncRepository taskRepository;
    @Mock private IUtpPortalGateway utpPortalGateway;
    @InjectMocks private TaskQueryService taskQueryService;

    @Test
    @DisplayName("toTaskSyncItem conserva evaluationSystem, courseCode, dueDate e isQualified")
    void mapsAllOfficialFields() {
        when(taskRepository.findByStudentId("U23307609")).thenReturn(List.of());
        when(utpPortalGateway.fetchUpcomingEvaluations(anyString(), eq(15))).thenReturn(List.of(
                new UpcomingEvaluationDto(
                        "eval-1", "PARTICIPACIÓN EN CLASE", "ACTIVITY", 15,
                        "2026-11-10T08:00:00", "2026-11-10T23:59:00",
                        "SERVICIOS CLOUD", "100000SI97", "sec-1", "act-1",
                        "PA", "PENDING", true, "FORO", "esta semana", 3)));

        List<TaskSyncItem> items = taskQueryService.getTasksWithPortalFallback("U23307609", "Bearer token");

        assertEquals(1, items.size());
        TaskSyncItem item = items.get(0);
        assertEquals("100000SI97", item.getCourseCode());
        assertEquals("PA", item.getEvaluationSystem());
        assertEquals("SERVICIOS CLOUD", item.getCourseName());
        assertEquals(15, item.getWeek());
        assertNotNull(item.getDueDate());
        assertEquals(LocalDateTime.of(2026, 11, 10, 23, 59), item.getDueDate());
        assertEquals(Boolean.TRUE, item.getIsQualified());
        assertEquals("FORO", item.getClassificationCategory());
        assertEquals("esta semana", item.getUrgency());
        assertEquals(Integer.valueOf(3), item.getDaysRemaining());
    }
}
