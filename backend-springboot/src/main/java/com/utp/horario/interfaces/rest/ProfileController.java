package com.utp.horario.interfaces.rest;

import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.domain.model.exceptions.ResourceNotFoundException;
import com.utp.horario.domain.model.repositories.IStudentRepository;
import com.utp.horario.infrastructure.security.CurrentStudent;
import com.utp.horario.interfaces.rest.dto.ApiResponse;
import com.utp.horario.interfaces.rest.dto.UpdateProfileRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@Tag(name = "06. Perfil del Estudiante", description = "Gestión del perfil del estudiante, canales de contacto y datos comerciales")
@Slf4j
@RestController
@RequestMapping({"/profile", "/api/v1/profile"})
@RequiredArgsConstructor
public class ProfileController {

    private final IStudentRepository studentRepository;

    @Operation(summary = "Obtener el perfil del estudiante autenticado")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<StudentProfile>> getMyProfile(@CurrentStudent String studentId) {
        StudentProfile profile = resolveStudent(studentId);
        return ResponseEntity.ok(ApiResponse.ok(profile));
    }

    @Operation(summary = "Actualizar canales de contacto, WhatsApp y foto de perfil")
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<StudentProfile>> updateMyProfile(
            @CurrentStudent String studentId,
            @Valid @RequestBody UpdateProfileRequest request) {
        StudentProfile existing = resolveStudent(studentId);

        if (request.getPhoneWhatsapp() != null) {
            existing.setPhoneWhatsapp(request.getPhoneWhatsapp().trim());
        }
        if (request.getAvatarUrl() != null) {
            existing.setAvatarUrl(request.getAvatarUrl().trim());
        }
        if (request.getSocialLink() != null) {
            existing.setSocialLink(request.getSocialLink().trim());
        }
        if (request.getCampusLocation() != null) {
            existing.setCampusLocation(request.getCampusLocation().trim());
        }
        if (request.getBio() != null) {
            existing.setBio(request.getBio().trim());
        }

        StudentProfile updated = studentRepository.save(existing);
        log.info("[ProfileController] Perfil actualizado exitosamente para estudiante: {}", studentId);
        return ResponseEntity.ok(ApiResponse.ok("Perfil actualizado exitosamente", updated));
    }

    private StudentProfile resolveStudent(String studentCode) {
        Optional<StudentProfile> opt = studentRepository.findByStudentCode(studentCode);
        if (opt.isEmpty()) {
            opt = studentRepository.findByStudentCode(studentCode.toUpperCase());
        }
        if (opt.isEmpty()) {
            opt = studentRepository.findByStudentCode(studentCode.toLowerCase());
        }
        if (opt.isEmpty()) {
            opt = studentRepository.findById(studentCode);
        }
        return opt.orElseThrow(() -> new ResourceNotFoundException("Perfil no encontrado para el estudiante: " + studentCode));
    }
}
