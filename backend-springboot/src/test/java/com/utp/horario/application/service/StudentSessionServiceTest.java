package com.utp.horario.application.service;

import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.mockito.Mockito.verifyNoInteractions;

/**
 * Gestión de sesión de estudiante en modo 100% stateless.
 *
 * <p>El gateway ya no expone registro de tokens: el backend es stateless y la
 * identidad se resuelve en cada petición desde el JWT Bearer. Estas pruebas
 * blindan que {@code registerSessionToken} sea un/no-op inocuo: no lanza,
 * no persiste credenciales y no interactúa con la pasarela, tenga o no datos.</p>
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
    @DisplayName("Código y token legítimos: no se registra nada (modo stateless)")
    void registersNothingWhenCodeAndTokenPresent() {
        sessionService.registerSessionToken("U23307609", "Bearer session-token");

        verifyNoInteractions(gateway);
    }

    @Test
    @DisplayName("Código ausente o en blanco: no se registra nada")
    void skipsWhenCodeMissingOrBlank() {
        sessionService.registerSessionToken(null, "token");
        sessionService.registerSessionToken("", "token");
        sessionService.registerSessionToken("   ", "token");

        verifyNoInteractions(gateway);
    }

    @Test
    @DisplayName("Token ausente o en blanco: no se registra nada")
    void skipsWhenTokenMissingOrBlank() {
        sessionService.registerSessionToken("U23307609", null);
        sessionService.registerSessionToken("U23307609", "");
        sessionService.registerSessionToken("U23307609", "   ");

        verifyNoInteractions(gateway);
    }
}
