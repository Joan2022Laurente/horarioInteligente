package com.utp.horario.application.service;

import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Consulta de horario oficial (Export Schedule ICS Use Case).
 *
 * <p>Canaliza la exportación del calendario oficial por application: vincula la
 * sesión legítima del estudiante con {@link StudentSessionService} y solicita el
 * calendario al puerto de la pasarela. La capa web no conoce el puerto.</p>
 */
@Service
@RequiredArgsConstructor
public class ScheduleQueryService {

    private final IUtpPortalGateway utpPortalGateway;
    private final StudentSessionService sessionService;

    /**
     * Exporta el calendario ICS oficial del periodo, tras registrar el token de
     * sesión legítimo. Contrato de honestidad del puerto: {@code null} = la
     * pasarela no pudo entregar el calendario (el servidor responde 404/500 de
     * transporte, no un archivo falsificado).
     */
    public String exportScheduleIcs(String studentCode, String resolvedToken, String period) {
        sessionService.registerSessionToken(studentCode, resolvedToken);
        return utpPortalGateway.exportCalendarIcs(resolvedToken, period);
    }
}
