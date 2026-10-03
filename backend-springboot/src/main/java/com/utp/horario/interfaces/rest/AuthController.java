package com.utp.horario.interfaces.rest;

import com.utp.horario.application.command.AuthenticateStudentCommand;
import com.utp.horario.application.dtos.StudentDto;
import com.utp.horario.application.handle.AuthenticateStudentCommandHandler;
import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.infraestructure.security.SecurityIdentityResolver;
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
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "x-user-id", required = false) String xUserId) {
        String effectiveStudentCode = identityResolver.resolveStudentCode(authHeader, xUserId, id);
        StudentProfile profile = authCommandHandler.getProfile(effectiveStudentCode);
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.ok("Perfil de estudiante obtenido exitosamente", profile));
    }
}
