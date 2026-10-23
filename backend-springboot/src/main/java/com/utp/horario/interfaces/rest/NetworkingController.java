package com.utp.horario.interfaces.rest;

import com.utp.horario.application.service.NetworkingApplicationService;
import com.utp.horario.domain.model.aggregate.StudentNetworkingProfile;
import com.utp.horario.domain.model.aggregate.StudyBeacon;
import com.utp.horario.infrastructure.mappers.NetworkingProfileMapper;
import com.utp.horario.infrastructure.mappers.StudyBeaconMapper;
import com.utp.horario.infrastructure.security.CurrentStudent;
import com.utp.horario.interfaces.rest.dto.ApiResponse;
import com.utp.horario.interfaces.rest.dto.CreateBeaconRequest;
import com.utp.horario.interfaces.rest.dto.StudentNetworkingProfileDto;
import com.utp.horario.interfaces.rest.dto.StudyBeaconDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * API REST del Networking Universitario (Fase 1.0). Doble ruteo institucional
 * ({@code /networking} y {@code /api/v1/networking}) idéntico al módulo
 * Marketplace. Toda mutación liga la identidad al token JWT vía
 * {@code @CurrentStudent}: el cuerpo NUNCA decide quién es el anfitrión ni de
 * quién es el perfil (prevención IDOR/BOLA).
 */
@Slf4j
@RestController
@RequestMapping({"/networking", "/api/v1/networking"})
@RequiredArgsConstructor
public class NetworkingController {

    private final NetworkingApplicationService networkingService;
    private final StudyBeaconMapper beaconMapper;
    private final NetworkingProfileMapper profileMapper;

    /** Mesas de estudio activas; {@code campus} opcional filtra la sede. */
    @GetMapping("/beacons")
    public ResponseEntity<ApiResponse<List<StudyBeaconDto>>> getBeacons(
            @CurrentStudent(required = false) String studentId,
            @RequestParam(required = false) String campus) {
        List<StudyBeacon> beacons = networkingService.listActiveBeacons(campus);
        return ResponseEntity.ok(ApiResponse.ok(beaconMapper.toDtoList(beacons)));
    }

    /** Crea una Mesa de Estudio con el estudiante del token como anfitrión. */
    @PostMapping("/beacons")
    public ResponseEntity<ApiResponse<StudyBeaconDto>> createBeacon(
            @CurrentStudent String hostId,
            @RequestBody CreateBeaconRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("El cuerpo de la petición es obligatorio para crear la mesa."));
        }
        StudyBeacon created = networkingService.createBeacon(
                hostId,
                request.getCampus(),
                request.getLocationName(),
                request.getCourseName(),
                request.getSectionCode(),
                request.getObjective(),
                request.getMaxCollaborators());
        return ResponseEntity.ok(ApiResponse.ok("Mesa de estudio creada exitosamente", beaconMapper.toDto(created)));
    }

    /** El estudiante autenticado se une a una mesa; el agregado decide el aforo. */
    @PostMapping("/beacons/{id}/join")
    public ResponseEntity<ApiResponse<StudyBeaconDto>> joinBeacon(
            @CurrentStudent String studentId,
            @PathVariable String id) {
        StudyBeacon updated = networkingService.joinBeacon(id, studentId);
        return ResponseEntity.ok(ApiResponse.ok("Te uniste a la mesa de estudio", beaconMapper.toDto(updated)));
    }

    /** Perfiles candidatos REALES para el Matching Dual (sin ghost y sin el consultante). */
    @GetMapping("/profiles")
    public ResponseEntity<ApiResponse<List<StudentNetworkingProfileDto>>> getProfiles(
            @CurrentStudent String studentId,
            @RequestParam(required = false) String campus) {
        List<StudentNetworkingProfile> profiles = networkingService.listEligibleProfiles(studentId, campus);
        List<StudentNetworkingProfileDto> dtos = profiles.stream()
                .map(profileMapper::toDto)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(dtos));
    }

    /** Upsert del perfil de networking del estudiante autenticado (identidad por token). */
    @PostMapping("/profile/sync")
    public ResponseEntity<ApiResponse<StudentNetworkingProfileDto>> syncProfile(
            @CurrentStudent String studentId,
            @RequestBody StudentNetworkingProfileDto request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("El cuerpo del perfil de networking es obligatorio."));
        }
        StudentNetworkingProfile incoming = profileMapper.toDomain(request);
        StudentNetworkingProfile saved = networkingService.syncProfile(studentId, incoming);
        return ResponseEntity.ok(ApiResponse.ok("Perfil de networking sincronizado", profileMapper.toDto(saved)));
    }
}
