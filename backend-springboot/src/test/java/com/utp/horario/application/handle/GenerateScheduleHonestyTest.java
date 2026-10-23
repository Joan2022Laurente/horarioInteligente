package com.utp.horario.application.handle;

import com.utp.horario.domain.model.exceptions.ScheduleUnavailableException;
import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.domain.model.value_objects.ScheduleInterval;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regla de honestidad de datos del horario.
 *
 * <p>Cuando la pasarela no entrega el horario oficial ({@code fetchSchedule} → null),
 * el handler degrada al Read Model local o declara la ausencia — nunca adopta, ni
 * persiste, ni presenta un intervalo fabricado (fechas hardcodeadas 'interval-empty').</p>
 *
 * <p>Todos los colaboradores son mocks: ninguna prueba toca la pasarela real ni MySQL.</p>
 */
class GenerateScheduleHonestyTest {

    private static final String STUDENT = "U23307609";
    private static final String PERIOD = "2026 - Ciclo 2 Agosto";
    private static final String TOKEN = "Bearer token-fake";

    private IScheduleRepository repository;
    private IUtpPortalGateway gateway;
    private GenerateScheduleCommandHandler handler;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(IScheduleRepository.class);
        gateway = Mockito.mock(IUtpPortalGateway.class);
        handler = new GenerateScheduleCommandHandler(repository, gateway);
    }

    private ScheduleInterval realInterval() {
        return ScheduleInterval.builder()
                .id("interval-123")
                .periodName(PERIOD)
                .startDate(java.time.LocalDate.parse("2026-08-17"))
                .endDate(java.time.LocalDate.parse("2026-12-20"))
                .classes(List.of())
                .courses(List.of())
                .build();
    }

    @Test
    @DisplayName("Gateway sin respuesta + copia local válida: se sirve el Read Model y no se guarda nada")
    void gatewayMissDegradesToLocalReadModel() {
        when(gateway.fetchSchedule(TOKEN, PERIOD)).thenReturn(null);
        when(repository.findByStudentIdAndPeriod(STUDENT, PERIOD)).thenReturn(Optional.of(realInterval()));

        ScheduleInterval result = handler.getStudentSchedule(STUDENT, PERIOD, TOKEN);

        assertEquals("interval-123", result.getId());
        verify(repository, never()).save(anyString(), any(ScheduleInterval.class));
    }

    @Test
    @DisplayName("Gateway y copia local vacíos: intervalo honesto sin fechas inventadas ni fabricado 'interval-empty'")
    void totalMissReturnsHonestEmptyIntervalWithoutFabrication() {
        when(gateway.fetchSchedule(TOKEN, PERIOD)).thenReturn(null);
        when(repository.findByStudentIdAndPeriod(STUDENT, PERIOD)).thenReturn(Optional.empty());

        ScheduleInterval result = handler.getStudentSchedule(STUDENT, PERIOD, TOKEN);

        assertEquals("empty-" + STUDENT, result.getId());
        assertTrue(result.getClasses().isEmpty(), "El intervalo de ausencia no debe contener clases");
        assertNull(result.getStartDate(), "El intervalo de ausencia no debe inventar fechas oficiales");
        assertNull(result.getEndDate(), "El intervalo de ausencia no debe inventar fechas oficiales");
        verify(repository, never()).save(anyString(), any(ScheduleInterval.class));
    }

    @Test
    @DisplayName("Sincronización explícita con gateway sin respuesta: se declara ScheduleUnavailableException")
    void explicitSyncDeclaresAbsenceInsteadOfPersistingFabrication() {
        when(gateway.fetchSchedule(TOKEN, PERIOD)).thenReturn(null);

        assertThrows(ScheduleUnavailableException.class, () -> handler.syncScheduleFromUtp(STUDENT, TOKEN, PERIOD));
        verify(repository, never()).save(anyString(), any(ScheduleInterval.class));
    }

    @Test
    @DisplayName("Gateway entrega horario real: se adopta, se persiste y se devuelve")
    void gatewayHitIsAdoptedAndPersisted() {
        ScheduleInterval official = realInterval();
        when(gateway.fetchSchedule(TOKEN, PERIOD)).thenReturn(official);
        when(repository.save(eq(STUDENT), eq(official))).thenReturn(official);

        ScheduleInterval result = handler.syncScheduleFromUtp(STUDENT, TOKEN, PERIOD);

        assertEquals("interval-123", result.getId());
        verify(repository).save(STUDENT, official);
    }

    @Test
    @DisplayName("Identidad de estudiante inválida: rechazo sin consultar pasarela ni repositorio")
    void invalidIdentityIsRejectedWithoutRemoteCalls() {
        assertThrows(IllegalArgumentException.class, () -> handler.getStudentSchedule("current-student", PERIOD, TOKEN));
        assertThrows(IllegalArgumentException.class, () -> handler.syncScheduleFromUtp("  ", TOKEN, PERIOD));

        verify(gateway, never()).fetchSchedule(anyString(), anyString());
        verify(repository, never()).save(anyString(), any(ScheduleInterval.class));
    }
}
