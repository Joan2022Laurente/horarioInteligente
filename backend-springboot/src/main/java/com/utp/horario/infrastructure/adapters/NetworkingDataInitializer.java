package com.utp.horario.infrastructure.adapters;

import com.utp.horario.infrastructure.entities.StudentNetworkingProfileEntity;
import com.utp.horario.infrastructure.entities.StudyBeaconEntity;
import com.utp.horario.infrastructure.repositories.JPAStudentNetworkingProfileRepository;
import com.utp.horario.infrastructure.repositories.JPAStudyBeaconRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Sembrado inicial (Fase 1.0: Networking universitario). Puebla mesas de estudio
 * activas y perfiles candidatos a Matching Dual SOLO cuando la tabla está vacía,
 * con los mismos criterios de datos demo de sustentación del Marketplace
 * ({@code MarketplaceDataInitializer}). Elevado por @Order(3) para ejecutarse
 * después de los sembrados base del ciclo 1-2.
 */
@Slf4j
@Component
@Order(3)
@RequiredArgsConstructor
public class NetworkingDataInitializer implements CommandLineRunner {

    private final JPAStudyBeaconRepository beaconRepository;
    private final JPAStudentNetworkingProfileRepository profileRepository;

    @Override
    public void run(String... args) {
        seedBeacons();
        seedCandidateProfiles();
    }

    private void seedBeacons() {
        if (beaconRepository.count() > 0) {
            log.info("[NetworkingDataInitializer] study_beacons ya cuenta con {} registros.", beaconRepository.count());
            return;
        }

        log.info("[NetworkingDataInitializer] 🚀 Sembrando mesas de estudio activas en study_beacons...");
        LocalDateTime now = LocalDateTime.now();

        List<StudyBeaconEntity> beacons = List.of(
                StudyBeaconEntity.builder()
                        .id("bcn-seed-101")
                        .hostId("U23307609")
                        .hostName("Joan Callañaupa")
                        .hostAvatar("J")
                        .campus("Lima Centro")
                        .locationName("Torre A - Piso 8 (Laboratorio de PC)")
                        .courseName("Desarrollo Web Integrado")
                        .sectionCode("UC0291")
                        .objective("Resolver el laboratorio de Spring Boot + JPA para la PC1")
                        .maxCollaborators(4)
                        .currentCollaborators(2)
                        .status("ACTIVE")
                        .expiresAt(now.plusHours(3))
                        .createdAt(now.minusHours(1))
                        .build(),

                StudyBeaconEntity.builder()
                        .id("bcn-seed-102")
                        .hostId("U23109842")
                        .hostName("Sebastian Morales")
                        .hostAvatar("S")
                        .campus("Lima Centro")
                        .locationName("Pabellón B - Piso 4 (Biblioteca Silenciosa)")
                        .courseName("Servicios Cloud")
                        .sectionCode(null)
                        .objective("Configurar VPC, Subnets y EC2 en el reto de AWS Academy")
                        .maxCollaborators(4)
                        .currentCollaborators(3)
                        .status("ACTIVE")
                        .expiresAt(now.plusHours(2))
                        .createdAt(now.minusMinutes(90))
                        .build(),

                StudyBeaconEntity.builder()
                        .id("bcn-seed-103")
                        .hostId("U23106545")
                        .hostName("Valeria Torres")
                        .hostAvatar("V")
                        .campus("Lima Centro")
                        .locationName("Torre B - Piso 3 (Sala de Estudio Grupal)")
                        .courseName("Cálculo Aplicado a la Física")
                        .sectionCode(null)
                        .objective("Repaso de integrales antes de la Práctica Calificada 2")
                        .maxCollaborators(5)
                        .currentCollaborators(1)
                        .status("ACTIVE")
                        .expiresAt(now.plusHours(5))
                        .createdAt(now.minusMinutes(15))
                        .build()
        );

        beaconRepository.saveAll(beacons);
        log.info("[NetworkingDataInitializer] ✅ {} mesas de estudio sembradas como demo de sustentación.", beacons.size());
    }

    private void seedCandidateProfiles() {
        if (profileRepository.count() > 0) {
            log.info("[NetworkingDataInitializer] student_networking_profiles ya cuenta con {} registros.", profileRepository.count());
            return;
        }

        log.info("[NetworkingDataInitializer] 🚀 Sembrando perfiles candidatos para el Matching Dual...");
        LocalDateTime now = LocalDateTime.now();

        List<StudentNetworkingProfileEntity> profiles = List.of(
                StudentNetworkingProfileEntity.builder()
                        .studentCode("U23214589")
                        .fullName("Camila Rodriguez")
                        .avatarLetter("C")
                        .career("Ing. de Software")
                        .campus("Lima Centro")
                        .cycle(6)
                        .program("Pregrado")
                        .enrolledCoursesJson("[\"DESARROLLO WEB INTEGRADO\", \"FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS\"]")
                        .freeWindowsJson("[{\"dayNumber\":1,\"dayName\":\"Lunes\",\"startTime\":\"14:00\",\"endTime\":\"16:00\",\"campus\":\"Lima Centro\",\"building\":\"SL02_TTA\",\"floor\":\"P08\"},{\"dayNumber\":3,\"dayName\":\"Miércoles\",\"startTime\":\"16:00\",\"endTime\":\"18:00\",\"campus\":\"Lima Centro\",\"building\":\"SL02_TTA\",\"floor\":\"P08\"}]")
                        .skillsJson("[\"Java\", \"Spring Boot\", \"Figma\"]")
                        .matchIntent("PROJECT_TEAM")
                        .contactChannelsJson("{\"whatsapp\":\"982 145 781\", \"email\":\"u23214589@utp.edu.pe\"}")
                        .ghostMode(false)
                        .updatedAt(now)
                        .build(),

                StudentNetworkingProfileEntity.builder()
                        .studentCode("U23109842")
                        .fullName("Sebastian Morales")
                        .avatarLetter("S")
                        .career("Ing. de Sistemas")
                        .campus("Lima Centro")
                        .cycle(7)
                        .program("Pregrado")
                        .enrolledCoursesJson("[\"SERVICIOS CLOUD\", \"DESARROLLO DE SOFTWARE AVANZADO\"]")
                        .freeWindowsJson("[{\"dayNumber\":4,\"dayName\":\"Jueves\",\"startTime\":\"16:00\",\"endTime\":\"18:00\",\"campus\":\"Lima Centro\",\"building\":\"SL02_PB\",\"floor\":\"P04\"}]")
                        .skillsJson("[\"Docker\", \"AWS\", \"TypeScript\"]")
                        .matchIntent("STUDY_BUDDY")
                        .contactChannelsJson("{\"discord\":\"sebastian#4321\", \"email\":\"u23109842@utp.edu.pe\"}")
                        .ghostMode(false)
                        .updatedAt(now)
                        .build(),

                StudentNetworkingProfileEntity.builder()
                        .studentCode("U23106545")
                        .fullName("Valeria Torres")
                        .avatarLetter("V")
                        .career("Ing. Industrial")
                        .campus("Lima Centro")
                        .cycle(5)
                        .program("Pregrado")
                        .enrolledCoursesJson("[\"HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA\"]")
                        .freeWindowsJson("[{\"dayNumber\":2,\"dayName\":\"Martes\",\"startTime\":\"10:00\",\"endTime\":\"12:00\",\"campus\":\"Lima Centro\",\"building\":\"SL02_TB\",\"floor\":\"P03\"}]")
                        .skillsJson("[\"Cálculo\", \"Excel\", \"Power BI\"]")
                        .matchIntent("EXAM_PREP")
                        .contactChannelsJson("{\"whatsapp\":\"971 305 448\", \"email\":\"u23106545@utp.edu.pe\"}")
                        .ghostMode(false)
                        .updatedAt(now)
                        .build()
        );

        profileRepository.saveAll(profiles);
        log.info("[NetworkingDataInitializer] ✅ {} perfiles candidatos sembrados como demo de sustentación.", profiles.size());
    }
}
