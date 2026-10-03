package com.utp.horario.application.handle;

import com.utp.horario.application.assembler.ScheduleAssembler;
import com.utp.horario.application.command.GenerateScheduleCommand;
import com.utp.horario.application.dtos.ScheduleDto;
import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.domain.model.value_objets.ScheduleInterval;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

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

    public ScheduleInterval getStudentSchedule(String studentId, String period, String token) {
        if (studentId == null || studentId.isBlank() || "current-student".equalsIgnoreCase(studentId)) {
            throw new IllegalArgumentException("Identidad de estudiante inválida para consultar horario");
        }
        if (token != null && !token.isBlank()) {
            ScheduleInterval interval = utpPortalGateway.fetchSchedule(token, period);
            return repository.save(studentId, interval);
        }
        return repository.findByStudentIdAndPeriod(studentId, period)
                .orElseGet(() -> (token != null && !token.isBlank())
                        ? syncScheduleFromUtp(studentId, token, period)
                        : ScheduleInterval.builder()
                                .id("empty-" + studentId)
                                .periodName(period)
                                .classes(List.of())
                                .courses(List.of())
                                .build());
    }

    public ScheduleInterval syncScheduleFromUtp(String studentId, String token, String period) {
        if (studentId == null || studentId.isBlank() || "current-student".equalsIgnoreCase(studentId)) {
            throw new IllegalArgumentException("Identidad de estudiante inválida para sincronizar horario");
        }
        ScheduleInterval interval = utpPortalGateway.fetchSchedule(token, period);
        return repository.save(studentId, interval);
    }
}
