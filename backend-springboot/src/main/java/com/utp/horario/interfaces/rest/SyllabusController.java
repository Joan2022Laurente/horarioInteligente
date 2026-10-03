package com.utp.horario.interfaces.rest;

import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.application.service.SyllabusService;
import com.utp.horario.infraestructure.security.CurrentStudent;
import com.utp.horario.infraestructure.security.SecurityIdentityResolver;
import com.utp.horario.interfaces.rest.dto.ApiResponse;
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
@RequestMapping({"/syllabus", "/api/v1/syllabus"})
@RequiredArgsConstructor
public class SyllabusController {

    private final SyllabusService syllabusServicePort;
    private final SecurityIdentityResolver identityResolver;
    private final com.utp.horario.domain.model.repositories.IUtpPortalGateway utpPortalGatewayPort;

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

    @GetMapping(value = "/{courseCode}/markdown", produces = "text/markdown; charset=utf-8")
    public ResponseEntity<String> getSyllabusMarkdown(
            @PathVariable String courseCode,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = identityResolver.extractBearerToken(authHeader);
        String markdown = utpPortalGatewayPort.fetchSyllabusMarkdown(token, courseCode);
        return ResponseEntity.ok(markdown != null ? markdown : "");
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Syllabus>>> getAllSyllabi(@CurrentStudent String studentId) {
        List<Syllabus> list = syllabusServicePort.getAllSyllabiForStudent(studentId);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @PostMapping("/save")
    public ResponseEntity<ApiResponse<Syllabus>> saveSyllabus(@RequestBody Syllabus syllabus) {
        Syllabus saved = syllabusServicePort.saveSyllabus(syllabus);
        return ResponseEntity.ok(ApiResponse.ok("SÃ­labo guardado exitosamente en base de datos", saved));
    }
}

