package com.utp.horario.application.service;

import com.utp.horario.domain.model.aggregate.StudentNetworkingProfile;
import com.utp.horario.domain.model.aggregate.StudyBeacon;
import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.domain.model.repositories.INetworkingProfileRepository;
import com.utp.horario.domain.model.repositories.IStudentRepository;
import com.utp.horario.domain.model.repositories.IStudyBeaconRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Caso de uso de Networking Universitario (Fase 1.0): Mesas de Estudio
 * (Study Beacons) y Matching Dual de compañeros.
 *
 * <p>Solo orquesta puertos de dominio. Los invariantes de negocio viven en los
 * agregados: la capacidad y los estados de una mesa son responsabilidad de
 * {@code StudyBeacon.join()}, la elegibilidad de un candidato de
 * {@code StudentNetworkingProfile.isEligibleForMatching()}. Aquí solo se
 * establece el orden del ciclo.</p>
 *
 * <p>Honestidad de datos: los nombres, sedes y carreras provienen del
 * {@code StudentProfile} persistido por el bootstrap; cuando faltan se declaran
 * a partir del código institucional (ej. "Anfitrión U23307609"), nunca se
 * inventan identidades.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NetworkingApplicationService {

    private static final int DEFAULT_MAX_COLLABORATORS = 4;
    private static final int MIN_MAX_COLLABORATORS = 2;
    private static final int MAX_ALLOWED_COLLABORATORS = 10;
    private static final int BEACON_TTL_HOURS = 3;

    private final IStudyBeaconRepository beaconRepository;
    private final INetworkingProfileRepository networkingProfileRepository;
    private final IStudentRepository studentRepository;

    // ─── Mesas de Estudio (Study Beacons) ─────────────────────────────────────

    /**
     * Mesas activas visibles para el listado; las mesas ACTIVE cuyo {@code expires_at}
     * ya venció se marcan EXPIRED (sweep de honestidad sobre el estado persistido).
     */
    public List<StudyBeacon> listActiveBeacons(String campus) {
        List<StudyBeacon> active = new ArrayList<>(beaconRepository.findActiveByCampus(campus));
        LocalDateTime now = LocalDateTime.now();
        List<StudyBeacon> expired = active.stream()
                .filter(beacon -> isActive(beacon) && beacon.getExpiresAt() != null && beacon.getExpiresAt().isBefore(now))
                .collect(Collectors.toList());

        for (StudyBeacon beacon : expired) {
            beacon.setStatus("EXPIRED");
            beaconRepository.update(beacon);
        }
        active.removeAll(expired);
        return active;
    }

    /** Crea una mesa de estudio con el estudiante autenticado como anfitrión. */
    public StudyBeacon createBeacon(String hostId, String requestedCampus, String locationName,
                                    String courseName, String sectionCode, String objective,
                                    Integer maxCollaborators) {
        if (hostId == null || hostId.isBlank()) {
            throw new IllegalArgumentException("Identidad del anfitrión no disponible para crear la mesa.");
        }
        if (courseName == null || courseName.isBlank()) {
            throw new IllegalArgumentException("La asignatura es obligatoria para crear la mesa de estudio.");
        }
        if (locationName == null || locationName.isBlank()) {
            throw new IllegalArgumentException("La ubicación en campus es obligatoria para crear la mesa de estudio.");
        }

        int effectiveMax = maxCollaborators != null ? maxCollaborators : DEFAULT_MAX_COLLABORATORS;
        if (effectiveMax < MIN_MAX_COLLABORATORS || effectiveMax > MAX_ALLOWED_COLLABORATORS) {
            throw new IllegalArgumentException("El aforo de la mesa debe estar entre "
                    + MIN_MAX_COLLABORATORS + " y " + MAX_ALLOWED_COLLABORATORS + " integrantes.");
        }

        StudentProfile host = studentRepository.findByStudentCode(hostId).orElse(null);

        String resolvedCampus = firstNonBlank(requestedCampus, host != null ? host.getCampus() : null);
        if (resolvedCampus == null) {
            throw new IllegalArgumentException("No se pudo determinar la sede de la mesa; sincroniza tu horario institucional primero.");
        }

        String hostName = firstNonBlank(host != null ? host.getFullName() : null, "Anfitrión " + hostId.toUpperCase());
        String hostAvatar = initialLetter(hostName);

        StudyBeacon beacon = StudyBeacon.builder()
                .id("bcn_" + hostId.toUpperCase() + "_" + System.currentTimeMillis())
                .hostId(hostId.toUpperCase())
                .hostName(hostName)
                .hostAvatar(hostAvatar)
                .campus(resolvedCampus)
                .locationName(locationName.trim())
                .courseName(courseName.trim())
                .sectionCode(trimToNull(sectionCode))
                .objective(trimToNull(objective))
                .maxCollaborators(effectiveMax)
                .currentCollaborators(1)
                .status("ACTIVE")
                .expiresAt(LocalDateTime.now().plusHours(BEACON_TTL_HOURS))
                .createdAt(LocalDateTime.now())
                .build();

        StudyBeacon saved = beaconRepository.save(beacon);
        log.info("[Networking] 📣 Mesa de estudio creada [{}] por [{}] en [{}] ({}): {}",
                saved.getId(), saved.getHostId(), saved.getCampus(), saved.getLocationName(), saved.getCourseName());
        return saved;
    }

    /**
     * El estudiante autenticado se une a la mesa. La transición de capacidad y
     * el estado FULL los decide el agregado ({@code StudyBeacon.join()}); este
     * caso de uso persiste el resultado y traduce el rechazo a error de negocio.
     */
    public StudyBeacon joinBeacon(String beaconId, String studentId) {
        if (studentId == null || studentId.isBlank()) {
            throw new IllegalArgumentException("Identidad del estudiante no disponible para unirse a la mesa.");
        }
        StudyBeacon beacon = beaconRepository.findById(beaconId)
                .orElseThrow(() -> new IllegalArgumentException("Mesa de estudio no encontrada."));

        // Sweep de expiración previo a intentar el join (evita unirse a mesas vencidas).
        if (isActive(beacon) && beacon.getExpiresAt() != null && LocalDateTime.now().isAfter(beacon.getExpiresAt())) {
            beacon.setStatus("EXPIRED");
        }

        if (studentId.equalsIgnoreCase(beacon.getHostId())) {
            beaconRepository.update(beacon);
            throw new IllegalArgumentException("Ya eres el anfitrión de esta mesa de estudio.");
        }

        boolean joined = beacon.join();
        beaconRepository.update(beacon);
        if (!joined) {
            throw new IllegalArgumentException(beacon.getExpiresAt() != null && "EXPIRED".equals(beacon.getStatus())
                    ? "La mesa de estudio ya expiró."
                    : "La mesa alcanzó su aforo máximo y no acepta más integrantes.");
        }

        log.info("[Networking] 🤝 Estudiante [{}] se unió a la mesa [{}] ({}/{}).",
                studentId, beacon.getId(), beacon.getCurrentCollaborators(), beacon.getMaxCollaborators());
        return beacon;
    }

    // ─── Matching Dual (perfiles candidatos) ──────────────────────────────────

    /** Perfiles elegibles (sin ghost mode y excluyendo al consultante autenticado). */
    public List<StudentNetworkingProfile> listEligibleProfiles(String studentId, String campus) {
        if (studentId == null || studentId.isBlank()) {
            return List.of();
        }
        return networkingProfileRepository.findEligibleCandidates(studentId, campus).stream()
                .filter(StudentNetworkingProfile::isEligibleForMatching)
                .toList();
    }

    /**
     * Upsert del perfil de networking del estudiante autenticado. La identidad es
     * inmutable: el código del token JWT sobrescribe cualquier código del cuerpo
     * (prevención IDOR). Los campos que el cliente no calculó se heredan del
     * {@code StudentProfile} persistido cuando existan.
     */
    public StudentNetworkingProfile syncProfile(String studentCode, StudentNetworkingProfile incoming) {
        if (studentCode == null || studentCode.isBlank()) {
            throw new IllegalArgumentException("Perfil de estudiante no identificable.");
        }
        if (incoming == null) {
            throw new IllegalArgumentException("El perfil de networking es obligatorio.");
        }

        StudentProfile persisted = studentRepository.findByStudentCode(studentCode).orElse(null);
        incoming.setStudentCode(studentCode);
        if (isBlank(incoming.getFullName())) {
            incoming.setFullName(persisted != null ? persisted.getFullName() : null);
        }
        if (isBlank(incoming.getCareer()) && persisted != null) {
            incoming.setCareer(persisted.getCareer());
        }
        if (isBlank(incoming.getCampus()) && persisted != null) {
            incoming.setCampus(persisted.getCampus());
        }
        if (incoming.getCycle() == null && persisted != null) {
            incoming.setCycle(persisted.getCurrentCycle());
        }
        if (isBlank(incoming.getAvatarLetter()) && !isBlank(incoming.getFullName())) {
            incoming.setAvatarLetter(initialLetter(incoming.getFullName()));
        }
        if (incoming.getFullName() == null || incoming.getFullName().isBlank()) {
            throw new IllegalArgumentException("El perfil de networking requiere el nombre del estudiante; sincroniza tu sesión institucional.");
        }
        incoming.setUpdatedAt(LocalDateTime.now());

        StudentNetworkingProfile saved = networkingProfileRepository.save(incoming);
        log.debug("[Networking] 🔄 Perfil de networking sincronizado para [{}] ghostMode={}", studentCode, saved.isGhostMode());
        return saved;
    }

    // ─── Utilidades ────────────────────────────────────────────────────────────

    private boolean isActive(StudyBeacon beacon) {
        return beacon.getStatus() != null && "ACTIVE".equalsIgnoreCase(beacon.getStatus());
    }

    private String firstNonBlank(String primary, String fallback) {
        return !isBlank(primary) ? primary.trim() : (!isBlank(fallback) ? fallback.trim() : null);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String trimToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private String initialLetter(String name) {
        return (name == null || name.isBlank()) ? "U" : name.trim().substring(0, 1).toUpperCase();
    }
}
