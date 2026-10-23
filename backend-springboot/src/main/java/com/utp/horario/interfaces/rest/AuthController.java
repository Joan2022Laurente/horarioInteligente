package com.utp.horario.interfaces.rest;

import com.utp.horario.application.command.AuthenticateStudentCommand;
import com.utp.horario.application.dtos.SessionBootstrapDto.SessionBootstrapResult;
import com.utp.horario.application.handle.AuthenticateStudentCommandHandler;
import com.utp.horario.application.service.SessionBootstrapService;
import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.infrastructure.security.SecurityIdentityResolver;
import com.utp.horario.interfaces.rest.dto.ApiResponse;
import com.utp.horario.interfaces.rest.dto.AuthRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/auth", "/api/v1/auth"})
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticateStudentCommandHandler authCommandHandler;
    private final SecurityIdentityResolver identityResolver;
    private final SessionBootstrapService sessionBootstrapService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<StudentProfile>> login(@RequestBody AuthRequest request) {
        StudentProfile profile;
        if (request.getToken() != null && !request.getToken().isBlank()) {
            profile = authCommandHandler.authenticateWithToken(request.getToken());
        } else {
            profile = authCommandHandler.handle(new AuthenticateStudentCommand(request.getUsername(), request.getPassword()));
        }
        return ResponseEntity.ok(ApiResponse.ok("Autenticación exitosa", profile));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<StudentProfile>> getAuthenticatedProfile(
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader != null && authHeader.toLowerCase().startsWith("bearer ")
                ? authHeader.substring(7).trim() : authHeader;
        StudentProfile profile = authCommandHandler.authenticateWithToken(token);
        return ResponseEntity.ok(ApiResponse.ok("Perfil de estudiante obtenido exitosamente", profile));
    }

    @GetMapping("/profile/{id}")
    public ResponseEntity<ApiResponse<StudentProfile>> getProfile(
            @PathVariable String id,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "x-user-id", required = false) String xUserId) {
        String effectiveStudentCode = identityResolver.resolveStudentCode(authHeader, xUserId, id);
        StudentProfile profile = authCommandHandler.getProfile(effectiveStudentCode);
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.ok("Perfil de estudiante obtenido exitosamente", profile));
    }

    /**
     * Fase 0.7 — Auto-Bootstrap Integral de sesión para el Stepper del Frontend:
     * <ol>
     *   <li>revalida la sesión institucional y persiste el perfil (si faltara);</li>
     *   <li>sincroniza y persiste el horario del periodo lectivo vigente;</li>
     *   <li>detecta los cursos matriculados y resuelve sus sílabos (local-first;
     *       los faltantes se descargan de la pasarela en paralelo).</li>
     * </ol>
     * El resumen {@link SessionBootstrapResult} alimenta cada paso del stepper:
     * credenciales ✓ → horario ✓ → sílabos ✓ → IA lista.
     */
    @PostMapping("/bootstrap")
    public ResponseEntity<ApiResponse<SessionBootstrapResult>> bootstrapSession(
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader != null && authHeader.toLowerCase().startsWith("bearer ")
                ? authHeader.substring(7).trim() : authHeader;
        StudentProfile profile = authCommandHandler.authenticateWithToken(token);
        SessionBootstrapResult result = sessionBootstrapService.bootstrapStudentData(
                profile.getStudentCode(), token, null);
        return ResponseEntity.ok(ApiResponse.ok("Bootstrap de sesión completo", result));
    }
}
