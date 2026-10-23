package com.utp.horario.application.handle;

import com.utp.horario.application.assembler.ScheduleAssembler;
import com.utp.horario.application.command.GenerateScheduleCommand;
import com.utp.horario.application.dtos.ScheduleDto;
import com.utp.horario.domain.model.exceptions.ScheduleUnavailableException;
import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.domain.model.value_objets.ScheduleInterval;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GenerateScheduleCommandHandler {

    private final IScheduleRepository repository;
    private final IUtpPortalGateway utpPortalGateway;
    private final ScheduleAssembler assembler;

    public ScheduleInterval handle(GenerateScheduleCommand command) {
        return syncScheduleFromUtp(command.getStudentId(), command.getToken(), command.getPeriod());
    }

    public ScheduleDto handleAsDto(GenerateScheduleCommand command) {
        ScheduleInterval interval = handle(command);
        return assembler.toDto(interval);
    }

    /**
     * Consulta del horario del alumno con regla de honestidad de datos:
     * se intenta la sincronización con la pasarela oficial solo si hay sesión, y se
     * adopta únicamente lo que la pasarela entregue ({@code null} = MISS). Ante
     * fallo se degrada al Read Model local y, como último recurso, a un intervalo
     * honestamente vacío (sin fechas ni semanas inventadas). Nada fabricado se
     * persiste ni se presenta como horario oficial.
     */
    public ScheduleInterval getStudentSchedule(String studentId, String period, String token) {
        if (studentId == null || studentId.isBlank() || "current-student".equalsIgnoreCase(studentId)) {
            throw new IllegalArgumentException("Identidad de estudiante inválida para consultar horario");
        }

        if (token != null && !token.isBlank()) {
            ScheduleInterval interval = utpPortalGateway.fetchSchedule(token, period);
            if (interval != null) {
                return repository.save(studentId, interval);
            }
            log.warn("[GenerateSchedule] ⚠️ La pasarela no entregó horario para [{}/{}]: se degrada al Read Model local",
                    studentId, period);
        }

        return repository.findByStudentIdAndPeriod(studentId, period)
                .orElseGet(() -> {
                    log.warn("[GenerateSchedule] 🚫 Sin horario oficial ni copia local para [{}/{}] — se declara ausencia (lectura)",
                            studentId, period);
                    return buildHonestEmptyInterval(studentId, period);
                });
    }

    /**
     * Sincronización EXPLÍCITA solicitada por el cliente: si la pasarela no puede
     * entregar el horario se declara la ausencia (HTTP 503 reintentable
     * vía {@code ScheduleUnavailableException}), nunca un intervalo fabricado.
     */
    public ScheduleInterval syncScheduleFromUtp(String studentId, String token, String period) {
        if (studentId == null || studentId.isBlank() || "current-student".equalsIgnoreCase(studentId)) {
            throw new IllegalArgumentException("Identidad de estudiante inválida para sincronizar horario");
        }
        ScheduleInterval interval = utpPortalGateway.fetchSchedule(token, period);
        if (interval == null) {
            throw new ScheduleUnavailableException(
                    "Horario no disponible para '" + period + "': la pasarela oficial no respondió. Reintenta en unos segundos.");
        }
        return repository.save(studentId, interval);
    }

    /**
     * Intervalo de ausencia: identifica al alumno y periodo consultados, sin clases,
     * cursos, fechas ni semanas inventadas. Es la representación honesta de "aún no
     * hay datos", no un horario fabricado.
     */
    private ScheduleInterval buildHonestEmptyInterval(String studentId, String period) {
        return ScheduleInterval.builder()
                .id("empty-" + studentId)
                .periodName(period)
                .classes(List.of())
                .courses(List.of())
                .build();
    }
}
