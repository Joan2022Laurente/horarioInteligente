package com.utp.horario.application.service;

import com.utp.horario.domain.model.aggregate.Syllabus;

import java.util.List;

public interface SyllabusService {
    Syllabus getSyllabusByCourseCode(String courseCode);
    Syllabus getSyllabus(String courseCode, String sectionId, String pdfUrl, String token);
    List<Syllabus> getAllSyllabiForStudent(String studentId);
    Syllabus saveSyllabus(Syllabus syllabus);

    /**
     * Consulta canónica del markdown oficial publicado en el portal (contrato
     * del puerto: {@code null} = no disponible; el cliente responde una cadena
     * vacía). La pasarela solo se toca desde application.
     */
    String getSyllabusMarkdown(String courseCode, String token);
}
