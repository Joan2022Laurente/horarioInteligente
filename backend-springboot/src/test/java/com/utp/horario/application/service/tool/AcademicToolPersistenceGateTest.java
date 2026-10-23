package com.utp.horario.application.service.tool;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.dtos.AcademicToolDto.SyllabusDetailsResult;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.repositories.IStudentRepository;
import com.utp.horario.domain.model.repositories.ISyllabusRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.domain.model.value_objects.SyllabusWeeklySession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Gate de honestidad del canal IA (PASO 4b): un sílabo obtenido de la pasarela solo se
 * adopta como resultado del agente y se persiste en MySQL cuando trae contenido
 * curricular verificable (fórmula + cronograma). Un objeto vacío o fabricado se trata
 * como MISS: la respuesta del agente declara "no encontrado" y no hay envenenamiento
 * del Read Model.
 *
 * <p>Todos los colaboradores son mocks: ninguna prueba toca OpenRouter, la pasarela
 * desplegada ni MySQL (presupuesto de demo).</p>
 */
class AcademicToolPersistenceGateTest {

    private static final String STUDENT = "U23307609";
    private static final String COURSE = "100000ST61";
    private static final String TOKEN = "Bearer token-fake";

    private IScheduleRepository scheduleRepository;
    private ISyllabusRepository syllabusRepository;
    private IStudentRepository studentRepository;
    private IUtpPortalGateway gateway;
    private AcademicToolService toolService;

    @BeforeEach
    void setUp() {
        scheduleRepository = Mockito.mock(IScheduleRepository.class);
        syllabusRepository = Mockito.mock(ISyllabusRepository.class);
        studentRepository = Mockito.mock(IStudentRepository.class);
        gateway = Mockito.mock(IUtpPortalGateway.class);

        when(gateway.getStudentToken(anyString())).thenReturn(TOKEN);
        when(studentRepository.findByStudentCode(anyString())).thenReturn(Optional.empty());
        when(scheduleRepository.findByStudentIdAndPeriod(anyString(), anyString())).thenReturn(Optional.empty());
        when(syllabusRepository.findByCourseCode(anyString())).thenReturn(Optional.empty());
        when(gateway.fetchCoursesSummary(anyString())).thenReturn(List.of());
        when(gateway.fetchSyllabusMarkdown(anyString(), anyString())).thenReturn("");

        toolService = new AcademicToolService(scheduleRepository, syllabusRepository, studentRepository,
                gateway, new ObjectMapper());
    }

    private Syllabus fabricatedEmptySyllabus() {
        return Syllabus.builder()
                .id(COURSE)
                .courseCode(COURSE)
                .courseName("ASIGNATURA UTP")
                .semester("2026 - Ciclo 2 Agosto")
                .credits(3)
                .modality("Oficial")
                .weeklyHours(4)
                .formula("")
                .weeklySchedule(List.of())
                .build();
    }

    private Syllabus completeSyllabus() {
        return Syllabus.builder()
                .id(COURSE)
                .courseCode(COURSE)
                .courseName("DESARROLLO WEB INTEGRADO")
                .semester("2026 - Ciclo 2 Agosto")
                .credits(2)
                .modality("Presencial")
                .formula("(20%)APF1 + (20%)APF2 + (20%)APF3 + (40%)PROY")
                .weeklySchedule(List.of(SyllabusWeeklySession.builder()
                        .week(1)
                        .unit("Unidad 1")
                        .topic("Arquitectura web moderna")
                        .build()))
                .build();
    }

    @Test
    @DisplayName("Un sílabo de pasarela sin contenido verificable no se adopta ni se persiste")
    void fabricatedGatewaySyllabusIsRejectedAndNotPersisted() {
        when(gateway.fetchSyllabus(Mockito.eq(TOKEN), Mockito.eq(COURSE), Mockito.isNull(), Mockito.isNull()))
                .thenReturn(fabricatedEmptySyllabus());

        SyllabusDetailsResult result = toolService.getSyllabusDetails(STUDENT, COURSE);

        assertEquals("Curso no encontrado", result.courseName());
        assertNull(result.credits());
        verify(syllabusRepository, never()).save(any(Syllabus.class));
    }

    @Test
    @DisplayName("Un sílabo completo de pasarela sí se adopta y se persiste en MySQL")
    void completeGatewaySyllabusIsAdoptedAndPersisted() {
        when(gateway.fetchSyllabus(Mockito.eq(TOKEN), Mockito.eq(COURSE), Mockito.isNull(), Mockito.isNull()))
                .thenReturn(completeSyllabus());

        SyllabusDetailsResult result = toolService.getSyllabusDetails(STUDENT, COURSE);

        assertEquals("DESARROLLO WEB INTEGRADO", result.courseName());
        assertEquals(Integer.valueOf(2), result.credits());
        verify(syllabusRepository).save(any(Syllabus.class));
    }

    @Test
    @DisplayName("Markdown oficial sin franja de créditos: el canal IA reporta null, no 3")
    void markdownOnlySyllabusReportsNullCreditsInsteadOfDefault() {
        when(gateway.fetchSyllabusMarkdown(anyString(), anyString()))
                .thenReturn("## Cronograma del sílabo oficial\n\nSemana 1: Introducción al curso.");

        SyllabusDetailsResult result = toolService.getSyllabusDetails(STUDENT, COURSE);

        assertNull(result.credits());
        assertEquals("100000ST61", result.courseCode());
        assertEquals("Obtenido directamente desde el Sílabo Oficial UTP", result.learningGoal());
        verify(gateway, never()).fetchSyllabus(anyString(), anyString(), any(), any());
    }
}
