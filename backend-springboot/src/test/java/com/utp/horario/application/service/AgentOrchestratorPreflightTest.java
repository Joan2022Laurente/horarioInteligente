package com.utp.horario.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.service.tool.AcademicToolDispatcher;
import com.utp.horario.application.service.tool.AcademicToolService;
import com.utp.horario.domain.model.value_objects.AiChatMessage;
import com.utp.horario.domain.model.value_objects.ClassSession;
import com.utp.horario.domain.model.value_objects.DailyQuotaStatus;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pre-Flight Guard (Fase 0.7.1): el orquestador responde localmente (0 ms, $0.00) cuando
 * el estudiante no registra datos académicos reales — sin gastar cuota diaria y sin
 * llamar a OpenRouter. La verificación de "OpenRouter nunca es invocado" se ancla en el
 * orden del pipeline: la inferencia ocurre SIEMPRE despues de consumeQuota, de modo que
 * la cuota no consumida garantiza que no hubo llamada de inferencia.
 */
@ExtendWith(MockitoExtension.class)
class AgentOrchestratorPreflightTest {

    private static final String STUDENT = "U23307609";

    @Mock
    private AcademicToolService toolService;

    @Mock
    private DailyQuotaService quotaService;

    private AgentOrchestratorServiceImpl orchestrator;

    @BeforeEach
    void setUp() {
        // Despachador real sobre los mocks: el orquestador consume el motor unificado (Fase 0.6).
        ObjectMapper objectMapper = new ObjectMapper();
        orchestrator = new AgentOrchestratorServiceImpl(
                toolService, quotaService, objectMapper,
                new AcademicToolDispatcher(toolService, objectMapper));
    }

    private ScheduleInterval scheduleWithClasses() {
        return ScheduleInterval.builder()
                .id("interval-preflight")
                .periodName("2026 - Ciclo 2 Agosto")
                .weekNumber(4)
                .classes(List.of(ClassSession.builder().courseCode("100000SI58").sectionId("101").build()))
                .courses(List.of())
                .build();
    }

    @Test
    @DisplayName("processUserQuery sin horario persistido responde localmente: cuota intacta y sin inferencia")
    void processUserQueryBlocksWithoutAcademicData() {
        when(toolService.resolveEffectiveStudentCode(STUDENT)).thenReturn(STUDENT);
        when(toolService.hasPersistedSchedule(STUDENT)).thenReturn(false);

        AiChatMessage response = orchestrator.processUserQuery(
                STUDENT, "¿Que temas vienen en la semana 4?", null, null, null, null);

        assertTrue(response.getContent().contains("sincroniza tu información institucional"));
        assertEquals("assistant", response.getRole());
        assertEquals(Boolean.TRUE, response.getMetadata().get("preflightBlocked"));
        // La inferencia vive tras consumeQuota: cuota no consumida ⇒ OpenRouter nunca llamado.
        verify(quotaService, never()).consumeQuota(anyString());
        verify(toolService).hasPersistedSchedule(STUDENT);
    }

    @Test
    @DisplayName("Identidad ausente o anonymous_user se bloquea sin consultar el snapshot ni gastar cuota")
    void anonymousIdentityNeverReachesInference() {
        when(toolService.resolveEffectiveStudentCode("current-student")).thenReturn(null);

        AiChatMessage response = orchestrator.processUserQuery(
                "current-student", "¿Que toca hoy?", null, null, null, null);

        assertTrue(response.getContent().contains("sincroniza tu información institucional"));
        verify(toolService, never()).hasPersistedSchedule(anyString());
        verify(quotaService, never()).consumeQuota(anyString());
    }

    @Test
    @DisplayName("streamProcessUserQuery emite la guía local por tokens y finaliza sin onError")
    void streamBlocksWithoutAcademicData() {
        when(toolService.resolveEffectiveStudentCode(anyString())).thenReturn(STUDENT);
        when(toolService.hasPersistedSchedule(STUDENT)).thenReturn(false);

        List<String> tokens = new ArrayList<>();
        AtomicBoolean done = new AtomicBoolean(false);
        List<Throwable> errors = new ArrayList<>();

        orchestrator.streamProcessUserQuery(STUDENT, "¿Que toca hoy?", null, null,
                tokens::add, event -> {
                }, () -> done.set(true), errors::add);

        assertEquals(1, tokens.size());
        assertTrue(tokens.get(0).contains("sincroniza tu información institucional"));
        assertTrue(done.get());
        assertTrue(errors.isEmpty());
        verify(quotaService, never()).consumeQuota(anyString());
    }

    @Test
    @DisplayName("Schedule del cliente con clases hace corto circuito: ni resolve ni lectura de snapshot")
    void clientScheduleShortCircuitsPersistedLookup() {
        when(quotaService.consumeQuota(STUDENT))
                .thenReturn(DailyQuotaStatus.builder().allowed(false).max(20).build());

        AiChatMessage response = orchestrator.processUserQuery(
                STUDENT, "¿Que toca hoy?", scheduleWithClasses(), null, null, null);

        assertTrue(response.getContent().contains("Has alcanzado tu límite"),
                "Con datos reales el flujo CONTINUA hasta la cuota: el guard no bloquea");
        verify(toolService, never()).resolveEffectiveStudentCode(anyString());
        verify(toolService, never()).hasPersistedSchedule(anyString());
    }

    @Test
    @DisplayName("Snapshot persistido con datos permite que el flujo continúe hasta la cuota")
    void persistedScheduleWithDataContinuesToQuota() {
        when(toolService.resolveEffectiveStudentCode(STUDENT)).thenReturn(STUDENT);
        when(toolService.hasPersistedSchedule(STUDENT)).thenReturn(true);
        when(quotaService.consumeQuota(STUDENT))
                .thenReturn(DailyQuotaStatus.builder().allowed(false).max(20).build());

        AiChatMessage response = orchestrator.processUserQuery(
                STUDENT, "¿Que toca hoy?", null, null, null, null);

        assertFalse(response.getMetadata().containsKey("preflightBlocked"),
                "El guard no debe bloquear a un estudiante con datos académicos reales");
        verify(quotaService).consumeQuota(STUDENT);
    }
}
