package com.utp.horario.application.service;

import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Compatibilidad de firma con la capa de interfaces. El backend es 100% stateless:
 * el token se lee de la cabecera Authorization de cada peticion, por lo que aqui
 * no se registra ni se conserva ninguna credencial.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StudentSessionService {

    @SuppressWarnings("unused")
    private final IUtpPortalGateway utpPortalGateway;

    public void registerSessionToken(String studentCode, String token) {
        if (studentCode == null || studentCode.isBlank() || token == null || token.isBlank()) {
            log.debug("[StudentSession] Sesion incompleta; no se almacena nada (modo stateless)");
            return;
        }
        log.debug("[StudentSession] Modo stateless: token no persistido para [{}]", studentCode);
    }
}
