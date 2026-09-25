package com.utp.horario.application.usecase;

import com.utp.horario.application.service.SyllabusParserEngine;
import com.utp.horario.domain.model.Syllabus;
import com.utp.horario.domain.port.in.SyllabusServicePort;
import com.utp.horario.domain.port.out.ScheduleRepositoryPort;
import com.utp.horario.domain.port.out.SyllabusRepositoryPort;
import com.utp.horario.domain.port.out.UtpPortalGatewayPort;
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
public class SyllabusServiceImpl implements SyllabusServicePort {

    private final SyllabusRepositoryPort syllabusRepositoryPort;
    private final ScheduleRepositoryPort scheduleRepositoryPort;
    private final UtpPortalGatewayPort utpPortalGatewayPort;
    private final SyllabusParserEngine syllabusParserEngine;

    @Override
    public Syllabus getSyllabusByCourseCode(String courseCode) {
        return getSyllabus(courseCode, null, null, null);
    }

    @Override
    public Syllabus getSyllabus(String courseCode, String sectionId, String pdfUrl, String token) {
        return syllabusRepositoryPort.findByCourseCode(courseCode)
                .filter(s -> s.getFormula() != null && !s.getFormula().isBlank() && s.getWeeklySchedule() != null && !s.getWeeklySchedule().isEmpty())
                .orElseGet(() -> {
                    String target = (pdfUrl != null && !pdfUrl.isBlank()) ? pdfUrl : 
                                   (sectionId != null && !sectionId.isBlank()) ? sectionId : courseCode;
                    log.info("[SyllabusServiceImpl] Descargando y parseando sílabo oficial para target='{}' (courseCode='{}')", target, courseCode);
                    String pdfText = utpPortalGatewayPort.fetchSyllabusPdfText(token != null ? token : "", target);
                    if (pdfText != null && !pdfText.isBlank()) {
                        Syllabus parsed = syllabusParserEngine.parse(pdfText, courseCode);
                        return syllabusRepositoryPort.save(parsed);
                    }
                    // Si no se pudo descargar el PDF oficial, devolver objeto base limpio sin persistir como definitivo
                    return syllabusParserEngine.parse("", courseCode);
                });
    }

    @Override
    public List<Syllabus> getAllSyllabiForStudent(String studentId) {
        if (studentId == null || studentId.isBlank() || "current-student".equalsIgnoreCase(studentId)) {
            return List.of();
        }

        // Obtener códigos de cursos matriculados según el horario persistido del estudiante
        Optional<com.utp.horario.domain.model.ScheduleInterval> scheduleOpt = 
                scheduleRepositoryPort.findByStudentIdAndPeriod(studentId, "2026 - Ciclo 2 Agosto");

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

        return syllabusRepositoryPort.findAllByCourseCodes(new ArrayList<>(enrolledCodes));
    }

    @Override
    public Syllabus parseAndSaveSyllabusText(String courseCode, String syllabusText) {
        Syllabus parsed = syllabusParserEngine.parse(syllabusText, courseCode);
        return syllabusRepositoryPort.save(parsed);
    }

    @Override
    public Syllabus saveSyllabus(Syllabus syllabus) {
        if (syllabus == null) {
            throw new IllegalArgumentException("El objeto sílabo no puede ser nulo");
        }
        log.info("[SyllabusServiceImpl] 💾 Guardando sílabo validado en base de datos para curso: {} ({})", 
                syllabus.getCourseName(), syllabus.getCourseCode());
        return syllabusRepositoryPort.save(syllabus);
    }

    @Override
    public String fetchRawSyllabusText(String courseCode, String sectionId, String pdfUrl, String token) {
        String target = (pdfUrl != null && !pdfUrl.isBlank()) ? pdfUrl : 
                       (sectionId != null && !sectionId.isBlank()) ? sectionId : courseCode;
        log.info("[SyllabusServiceImpl] Extrayendo texto crudo de PDF para target='{}' (courseCode='{}')", target, courseCode);
        String pdfText = utpPortalGatewayPort.fetchSyllabusPdfText(token != null ? token : "", target);
        return pdfText != null ? pdfText : "";
    }
}
