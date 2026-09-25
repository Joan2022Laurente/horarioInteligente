package com.utp.horario.presentation.controller;

import com.utp.horario.domain.model.Syllabus;
import com.utp.horario.domain.port.in.SyllabusServicePort;
import com.utp.horario.presentation.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/syllabus")
@RequiredArgsConstructor
public class SyllabusController {

    private final SyllabusServicePort syllabusServicePort;
    private final com.utp.horario.infrastructure.security.SecurityIdentityResolver identityResolver;

    @GetMapping("/{courseCode}")
    public ResponseEntity<ApiResponse<Syllabus>> getSyllabus(
            @PathVariable String courseCode,
            @RequestParam(required = false) String sectionId,
            @RequestParam(required = false) String pdfUrl,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = identityResolver.extractBearerToken(authHeader);
        Syllabus syllabus = syllabusServicePort.getSyllabus(courseCode, sectionId, pdfUrl, token);
        return ResponseEntity.ok(ApiResponse.ok(syllabus));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Syllabus>>> getAllSyllabi(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String studentId) {
        String effectiveStudentId = identityResolver.resolveStudentCode(authHeader, studentId);
        List<Syllabus> list = syllabusServicePort.getAllSyllabiForStudent(effectiveStudentId);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @PostMapping("/parse")
    public ResponseEntity<ApiResponse<Syllabus>> parseSyllabus(
            @RequestParam String courseCode,
            @RequestBody String syllabusText) {
        Syllabus parsed = syllabusServicePort.parseAndSaveSyllabusText(courseCode, syllabusText);
        return ResponseEntity.ok(ApiResponse.ok("Sílabo procesado correctamente", parsed));
    }

    @PostMapping("/save")
    public ResponseEntity<ApiResponse<Syllabus>> saveSyllabus(@RequestBody Syllabus syllabus) {
        Syllabus saved = syllabusServicePort.saveSyllabus(syllabus);
        return ResponseEntity.ok(ApiResponse.ok("Sílabo guardado exitosamente en base de datos", saved));
    }

    @GetMapping("/raw-text")
    public ResponseEntity<ApiResponse<String>> getRawText(
            @RequestParam String courseCode,
            @RequestParam(required = false) String sectionId,
            @RequestParam(required = false) String pdfUrl,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = authHeader != null && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
        String rawText = syllabusServicePort.fetchRawSyllabusText(courseCode, sectionId, pdfUrl, token);
        return ResponseEntity.ok(ApiResponse.ok("Texto de sílabo obtenido", rawText));
    }
}
