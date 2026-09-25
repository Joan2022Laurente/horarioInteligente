package com.utp.horario.application.usecase;

import com.utp.horario.domain.model.ScheduleInterval;
import com.utp.horario.domain.port.in.ScheduleServicePort;
import com.utp.horario.domain.port.out.ScheduleRepositoryPort;
import com.utp.horario.domain.port.out.UtpPortalGatewayPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ScheduleServiceImpl implements ScheduleServicePort {

    private final ScheduleRepositoryPort scheduleRepositoryPort;
    private final UtpPortalGatewayPort utpPortalGatewayPort;

    @Override
    public ScheduleInterval getStudentSchedule(String studentId, String period) {
        return getStudentSchedule(studentId, period, null);
    }

    @Override
    public ScheduleInterval getStudentSchedule(String studentId, String period, String token) {
        if (studentId == null || studentId.isBlank() || "current-student".equalsIgnoreCase(studentId)) {
            throw new IllegalArgumentException("Identidad de estudiante inválida para consultar horario");
        }
        if (token != null && !token.isBlank()) {
            ScheduleInterval interval = utpPortalGatewayPort.fetchSchedule(token, period);
            return scheduleRepositoryPort.save(studentId, interval);
        }
        return scheduleRepositoryPort.findByStudentIdAndPeriod(studentId, period)
                .orElseGet(() -> (token != null && !token.isBlank()) 
                        ? syncScheduleFromUtp(studentId, token, period) 
                        : ScheduleInterval.builder()
                                .id("empty-" + studentId)
                                .periodName(period)
                                .classes(java.util.List.of())
                                .courses(java.util.List.of())
                                .build());
    }

    @Override
    public ScheduleInterval syncScheduleFromUtp(String studentId, String token, String period) {
        if (studentId == null || studentId.isBlank() || "current-student".equalsIgnoreCase(studentId)) {
            throw new IllegalArgumentException("Identidad de estudiante inválida para sincronizar horario");
        }
        ScheduleInterval interval = utpPortalGatewayPort.fetchSchedule(token, period);
        return scheduleRepositoryPort.save(studentId, interval);
    }
}
