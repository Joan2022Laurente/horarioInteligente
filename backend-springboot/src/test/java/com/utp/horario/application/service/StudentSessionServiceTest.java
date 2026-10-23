package com.utp.horario.application.service;

import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * Gestión de sesión de estudiante: la pasarela solo recibe el registro cuando
 * código y token vienen con contenido real.
 */
class StudentSessionServiceTest {

    private IUtpPortalGateway gateway;
    private StudentSessionService sessionService;

    @BeforeEach
    void setUp() {
        gateway = Mockito.mock(IUtpPortalGateway.class);
        sessionService = new StudentSessionService(gateway);
    }

    @Test
    @DisplayName("Código y token legítimos: se registra la sesión en la pasarela")
    void registersWhenCodeAndTokenPresent() {
        sessionService.registerSessionToken("U23307609", "Bearer session-token");
        verify(gateway).registerStudentToken("U23307609", "Bearer session-token");
    }

    @Test
    @DisplayName("Código ausente o en blanco: no se registra nada")
    void skipsWhenCodeMissingOrBlank() {
        sessionService.registerSessionToken(null, "token");
        sessionService.registerSessionToken("", "token");
        sessionService.registerSessionToken("   ", "token");
        verify(gateway, never()).registerStudentToken(Mockito.anyString(), Mockito.anyString());
    }

    @Test
    @DisplayName("Token ausente o en blanco: no se registra nada")
    void skipsWhenTokenMissingOrBlank() {
        sessionService.registerSessionToken("U23307609", null);
        sessionService.registerSessionToken("U23307609", "");
        sessionService.registerSessionToken("U23307609", "   ");
        verify(gateway, never()).registerStudentToken(Mockito.anyString(), Mockito.anyString());
    }
}
