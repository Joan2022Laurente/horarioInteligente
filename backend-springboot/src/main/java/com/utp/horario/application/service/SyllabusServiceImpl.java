package com.utp.horario.application.service;

import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.repositories.ISyllabusRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.domain.model.value_objets.ScheduleInterval;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class SyllabusServiceImpl implements SyllabusService {

    private final ISyllabusRepository syllabusRepository;
    private final IScheduleRepository scheduleRepository;
    private final IUtpPortalGateway utpPortalGateway;

    @Override
    public Syllabus getSyllabusByCourseCode(String courseCode) {
        return getSyllabus(courseCode, null, null, null);
    }

    @Override
    public Syllabus getSyllabus(String courseCode, String sectionId, String pdfUrl, String token) {
        if (courseCode == null || courseCode.isBlank()) {
            return buildEmptySyllabus("UNKNOWN");
        }

        String targetCode = courseCode.trim();

        // 1. Repositorio local con contenido estructurado válido
        Optional<Syllabus> localOpt = completeSyllabus(syllabusRepository.findByCourseCode(targetCode));
        if (localOpt.isPresent()) {
            return localOpt.get();
        }

        // 1b. Resolución inversa por nombre: cuando el consumidor consulta por la
        //     denominación visible de la asignatura (no por su código de catálogo), se
        //     resuelve el sílabo ya persistido en el Read Model local. Esto evita el
        //     coste de la llamada remota y el re-procesamiento del PDF en la pasarela.
        if (!looksLikeCatalogCode(targetCode)) {
            Optional<Syllabus> byName = completeSyllabus(syllabusRepository.findByCourseName(targetCode));
            if (byName.isPresent()) {
                log.info("[SyllabusServiceImpl] Sílabo de '{}' resuelto localmente por nombre (sin llamada a la pasarela externa).",
                        targetCode);
                return byName.get();
            }
        }

        // 2. Gateway hacia portal externo con el código directo
        log.info("[SyllabusServiceImpl] Solicitando sílabo oficial v2.0.0 para courseCode='{}' (sectionId='{}', pdfUrl='{}')",
                targetCode, sectionId, pdfUrl);
        Syllabus fetched = utpPortalGateway.fetchSyllabus(token, targetCode, sectionId, pdfUrl);
        if (fetched != null && fetched.getWeeklySchedule() != null && !fetched.getWeeklySchedule().isEmpty()) {
            log.info("[SyllabusServiceImpl] Guardando en repositorio local sílabo de [{}] obtenido de API externa", targetCode);
            return syllabusRepository.save(fetched);
        }

        return buildEmptySyllabus(targetCode);
    }

    /**
     * Filtra los sílabos sin contenido curricular verificable: un objeto vacío no debe
     * presentarse como un sílabo oficial válido.
     */
    private Optional<Syllabus> completeSyllabus(Optional<Syllabus> syllabus) {
        return syllabus.filter(s -> s.getWeeklySchedule() != null && !s.getWeeklySchedule().isEmpty()
                && s.getFormula() != null && !s.getFormula().isBlank());
    }

    /**
     * Determina si un identificador tiene forma de código de catálogo (p. ej. {@code 100000ST61}).
     * Los códigos UTP son alfanuméricos, sin espacios y de longitud acotada; cualquier otra
     * forma se interpreta como denominación de asignatura.
     */
    private boolean looksLikeCatalogCode(String value) {
        if (value == null || value.isBlank()) return false;
        if (value.length() > 12) return false;
        return value.chars().allMatch(ch -> Character.isLetterOrDigit(ch) || ch == '-' || ch == '_');
    }

    @Override
    public List<Syllabus> getAllSyllabiForStudent(String studentId) {
        if (studentId == null || studentId.isBlank() || "current-student".equalsIgnoreCase(studentId)) {
            return List.of();
        }

        Optional<ScheduleInterval> scheduleOpt = 
                scheduleRepository.findByStudentIdAndPeriod(studentId, "2026 - Ciclo 2 Agosto");

        Set<String> enrolledCodes = new HashSet<>();
        scheduleOpt.ifPresent(schedule -> {
            if (schedule.getCourses() != null) {
                schedule.getCourses().forEach(c -> {
                    if (c.getCode() != null && !c.getCode().isBlank()) enrolledCodes.add(c.getCode().trim());
                });
            }
            if (schedule.getClasses() != null) {
                schedule.getClasses().forEach(cs -> {
                    if (cs.getCourseCode() != null && !cs.getCourseCode().isBlank()) enrolledCodes.add(cs.getCourseCode().trim());
                });
            }
        });

        if (enrolledCodes.isEmpty()) {
            return List.of();
        }

        return syllabusRepository.findAllByCourseCodes(new ArrayList<>(enrolledCodes));
    }

    @Override
    public Syllabus saveSyllabus(Syllabus syllabus) {
        if (syllabus == null) {
            throw new IllegalArgumentException("El objeto sílabo no puede ser nulo");
        }
        log.info("[SyllabusServiceImpl] Guardando sílabo validado en base de datos para curso: {} ({})", 
                syllabus.getCourseName(), syllabus.getCourseCode());
        return syllabusRepository.save(syllabus);
    }

    private Syllabus buildEmptySyllabus(String courseCode) {
        return Syllabus.builder()
                .id(courseCode)
                .courseCode(courseCode)
                .courseName(courseCode)
                .semester("2026 - Ciclo 2 Agosto")
                .credits(3)
                .modality("Presencial")
                .weeklyHours(4)
                .careers(List.of("Ingeniería de Sistemas e Informática"))
                .learningGoal("")
                .formula("")
                .evaluations(new ArrayList<>())
                .rules(new ArrayList<>())
                .weeklySchedule(new ArrayList<>())
                .build();
    }
}
