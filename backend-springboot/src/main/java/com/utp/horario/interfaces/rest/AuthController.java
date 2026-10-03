package com.utp.horario.interfaces.rest;

import com.utp.horario.application.command.AuthenticateStudentCommand;
import com.utp.horario.application.dtos.StudentDto;
import com.utp.horario.application.handle.AuthenticateStudentCommandHandler;
import com.utp.horario.domain.model.aggregate.StudentProfile;
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

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<StudentProfile>> login(@RequestBody AuthRequest request) {
        StudentProfile profile;
        if (request.getToken() != null && !request.getToken().isBlank()) {
            profile = authCommandHandler.authenticateWithToken(request.getToken());
        } else {
            StudentDto dto = authCommandHandler.handle(new AuthenticateStudentCommand(request.getUsername(), request.getPassword()));
            profile = authCommandHandler.getProfile(dto.getStudentCode());
            if (profile != null && dto.getToken() != null) {
                profile.setToken(dto.getToken());
            }
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
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && !authHeader.isBlank()) {
            String token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.substring(7).trim() : authHeader;
            if (token.contains(".")) {
                try {
                    String[] parts = token.split("\\.");
                    if (parts.length >= 2) {
                        byte[] decoded = java.util.Base64.getUrlDecoder().decode(parts[1]);
                        com.fasterxml.jackson.databind.JsonNode payload = new com.fasterxml.jackson.databind.ObjectMapper().readTree(decoded);
                        String sub = payload.hasNonNull("sub") ? payload.path("sub").asText() : "";
                        String prefUser = payload.hasNonNull("preferred_username") ? payload.path("preferred_username").asText() : "";
                        String studentCode = payload.hasNonNull("studentCode") ? payload.path("studentCode").asText() : "";
                        String userId = payload.hasNonNull("userId") ? payload.path("userId").asText() : "";

                        boolean matches = id.equalsIgnoreCase(sub)
                                || id.equalsIgnoreCase(prefUser)
                                || id.equalsIgnoreCase(studentCode)
                                || id.equalsIgnoreCase(userId);

                        if (!matches && !id.equals("current-student")) {
                            throw new SecurityException("Acceso prohibido (403): Intento de consulta cruzada no autorizada al perfil [" + id + "].");
                        }
                    }
                } catch (SecurityException se) {
                    throw se;
                } catch (Exception ignored) {
                }
            }
        }
        StudentProfile profile = authCommandHandler.getProfile(id);
        return ResponseEntity.ok(ApiResponse.ok(profile));
    }
}
