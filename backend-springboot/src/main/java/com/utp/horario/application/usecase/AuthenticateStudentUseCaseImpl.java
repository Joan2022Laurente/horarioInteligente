package com.utp.horario.application.usecase;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.StudentProfile;
import com.utp.horario.domain.port.in.AuthenticateStudentUseCase;
import com.utp.horario.domain.port.out.StudentRepositoryPort;
import com.utp.horario.domain.port.out.UtpPortalGatewayPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthenticateStudentUseCaseImpl implements AuthenticateStudentUseCase {

    private final StudentRepositoryPort studentRepositoryPort;
    private final UtpPortalGatewayPort utpPortalGatewayPort;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public StudentProfile authenticateWithCredentials(String username, String password) {
        StudentProfile profile = utpPortalGatewayPort.login(username, password);
        return studentRepositoryPort.save(profile);
    }

    @Override
    public StudentProfile authenticateWithToken(String token) {
        if (token != null && token.contains(".")) {
            try {
                String[] parts = token.split("\\.");
                if (parts.length >= 2) {
                    byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
                    JsonNode payload = objectMapper.readTree(decoded);
                    String studentCode = payload.hasNonNull("preferred_username") 
                            ? payload.path("preferred_username").asText().toUpperCase() 
                            : "";
                    String name = payload.hasNonNull("name") 
                            ? payload.path("name").asText() 
                            : (payload.hasNonNull("given_name") ? payload.path("given_name").asText() : studentCode);
                    String email = payload.hasNonNull("email") 
                            ? payload.path("email").asText() 
                            : (!studentCode.isBlank() ? studentCode.toLowerCase() + "@utp.edu.pe" : "");
                    String userId = payload.hasNonNull("userId") 
                            ? payload.path("userId").asText() 
                            : (payload.hasNonNull("sub") ? payload.path("sub").asText() : (!studentCode.isBlank() ? "usr-" + studentCode.toLowerCase() : "usr-guest"));

                    String career = payload.hasNonNull("career") ? payload.path("career").asText() : (payload.hasNonNull("carrera") ? payload.path("carrera").asText() : "");
                    String campus = payload.hasNonNull("campus") ? payload.path("campus").asText() : (payload.hasNonNull("campusDesc") ? payload.path("campusDesc").asText() : (payload.hasNonNull("sede") ? payload.path("sede").asText() : ""));
                    int cycle = payload.hasNonNull("cycle") ? payload.path("cycle").asInt(1) : (payload.hasNonNull("ciclo") ? payload.path("ciclo").asInt(1) : 1);

                    // Si faltan datos académicos en el JWT de Keycloak UTP SSO, enriquecer con histórico guardado en BD
                    if (!studentCode.isBlank()) {
                        Optional<StudentProfile> existingOpt = studentRepositoryPort.findByStudentCode(studentCode);
                        if (existingOpt.isPresent()) {
                            StudentProfile existing = existingOpt.get();
                            if (career.isBlank() && existing.getCareer() != null && !existing.getCareer().isBlank()) {
                                career = existing.getCareer();
                            }
                            if (campus.isBlank() && existing.getCampus() != null && !existing.getCampus().isBlank()) {
                                campus = existing.getCampus();
                            }
                            if (cycle <= 1 && existing.getCurrentCycle() != null && existing.getCurrentCycle() > 1) {
                                cycle = existing.getCurrentCycle();
                            }
                            if ((name.isBlank() || name.equalsIgnoreCase(studentCode)) && existing.getFullName() != null && !existing.getFullName().equalsIgnoreCase(studentCode)) {
                                name = existing.getFullName();
                            }
                        }
                    }

                    StudentProfile profile = StudentProfile.builder()
                            .id(userId)
                            .studentCode(studentCode)
                            .fullName(name)
                            .email(email)
                            .career(career)
                            .campus(campus)
                            .currentCycle(cycle)
                            .token(token)
                            .enrolledCourseCodes(List.of())
                            .build();
                    return studentRepositoryPort.save(profile);
                }
            } catch (Exception e) {
                log.warn("[AuthenticateStudentUseCaseImpl] Error al parsear JWT: {}", e.getMessage());
            }
        }
        throw new IllegalArgumentException("Token de autenticación UTP inválido o expirado");
    }

    @Override
    public StudentProfile getProfile(String studentId) {
        return studentRepositoryPort.findById(studentId)
                .or(() -> studentRepositoryPort.findByStudentCode(studentId))
                .orElseThrow(() -> new RuntimeException("Estudiante no encontrado: " + studentId));
    }
}
