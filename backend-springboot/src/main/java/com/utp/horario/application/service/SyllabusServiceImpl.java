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
        return syllabusRepository.findByCourseCode(courseCode)
                .filter(s -> s.getFormula() != null && !s.getFormula().isBlank() && s.getWeeklySchedule() != null && !s.getWeeklySchedule().isEmpty())
                .orElseGet(() -> {
                    log.info("[SyllabusServiceImpl] Solicitando sílabo oficial v1.2.0 para courseCode='{}' (sectionId='{}', pdfUrl='{}')",
                            courseCode, sectionId, pdfUrl);
                    Syllabus fetched = utpPortalGateway.fetchSyllabus(token, courseCode, sectionId, pdfUrl);
                    if (fetched != null && fetched.getWeeklySchedule() != null && !fetched.getWeeklySchedule().isEmpty()) {
                        log.info("[SyllabusServiceImpl] Guardando en repositorio local sílabo de [{}] obtenido de API externa", courseCode);
                        return syllabusRepository.save(fetched);
                    }
                    return buildEmptySyllabus(courseCode);
                });
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
