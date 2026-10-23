package com.utp.horario.application.service;

import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Gestión de sesión de estudiante en la pasarela (application).
 *
 * <p>Encapsula el registro del token de sesión legítimo para que los endpoints
 * de interfaces deleguen aquí sin conocer el puerto de dominio
 * {@code IUtpPortalGateway} — la dirección DDD interfaces ➜ application ➜
 * dominio se mantiene completa.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StudentSessionService {

    private final IUtpPortalGateway utpPortalGateway;

    /**
     * Registra el token de sesión del estudiante en la pasarela. Solo registra
     * cuando código y token vienen con contenido real: la ausencia de sesión no
     * se satura ni queda registrada como identidad.
     */
    public void registerSessionToken(String studentCode, String token) {
        if (studentCode == null || studentCode.isBlank() || token == null || token.isBlank()) {
            return;
        }
        utpPortalGateway.registerStudentToken(studentCode, token);
        log.debug("[StudentSession] 🔑 Token registrado en pasarela para alumno [{}]", studentCode);
    }
}
