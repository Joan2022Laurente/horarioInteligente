package com.utp.horario.application.service;

import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Caso de uso de exportación del calendario oficial ICS: la sesión se vincula
 * por application y la pasarela se consulta solo desde ahí.
 */
class ScheduleQueryServiceTest {

    private static final String STUDENT = "U23307609";
    private static final String PERIOD = "2026 - Ciclo 2 Agosto";

    private IUtpPortalGateway gateway;
    private StudentSessionService sessionService;
    private ScheduleQueryService queryService;

    @BeforeEach
    void setUp() {
        gateway = Mockito.mock(IUtpPortalGateway.class);
        sessionService = Mockito.mock(StudentSessionService.class);
        queryService = new ScheduleQueryService(gateway, sessionService);
    }

    @Test
    @DisplayName("Con sesión legítima: registra el token y delega la exportación")
    void exportOrchestratesSessionRegistrationAndFetch() {
        when(gateway.exportCalendarIcs("resolved-token", PERIOD)).thenReturn("BEGIN:VCALENDAR...");

        String ics = queryService.exportScheduleIcs(STUDENT, "resolved-token", PERIOD);

        assertEquals("BEGIN:VCALENDAR...", ics);
        verify(sessionService).registerSessionToken(STUDENT, "resolved-token");
        verify(gateway).exportCalendarIcs("resolved-token", PERIOD);
    }

    @Test
    @DisplayName("Sin token: el registro queda como no-op y el MISS del portal se transporta tal cual")
    void exportWithoutSessionTransportsHonestMiss() {
        when(gateway.exportCalendarIcs(null, PERIOD)).thenReturn(null);

        String ics = queryService.exportScheduleIcs(STUDENT, null, PERIOD);

        assertNull(ics, "Sin calendario oficial no se fabrica contenido ICS");
        verify(sessionService).registerSessionToken(STUDENT, null);
        verify(gateway).exportCalendarIcs(null, PERIOD);
    }
}
