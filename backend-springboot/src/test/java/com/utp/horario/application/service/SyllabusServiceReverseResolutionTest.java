package com.utp.horario.application.service;

import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.exceptions.SyllabusUnavailableException;
import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.repositories.ISyllabusRepository;
import com.utp.horario.domain.model.repositories.IUtpPortalGateway;
import com.utp.horario.domain.model.value_objects.SyllabusWeeklySession;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Resolución inversa de sílabos por denominación de asignatura.
 *
 * <p>El frontend puede consultar el sílabo por el nombre visible de la asignatura cuando
 * la caché de calendario no expone el código de catálogo. En ese caso el servicio debe
 * resolver el sílabo contra el Read Model local, sin invocar a la pasarela externa.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SyllabusServiceReverseResolutionTest {

    @Mock
    private ISyllabusRepository syllabusRepository;

    @Mock
    private IScheduleRepository scheduleRepository;

    @Mock
    private IUtpPortalGateway utpPortalGateway;

    @InjectMocks
    private SyllabusServiceImpl syllabusService;

    @Test
    @DisplayName("Un identificador que no parece código de catálogo se resuelve localmente por nombre")
    void resolvesByNameWithoutCallingExternalGateway() {
        Syllabus persisted = completeSyllabus("100000SI82", "FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS");
        when(syllabusRepository.findByCourseCode("FORMACION PARA LA INVESTIGACION SISTEMAS"))
                .thenReturn(Optional.empty());
        when(syllabusRepository.findByCourseName("FORMACION PARA LA INVESTIGACION SISTEMAS"))
                .thenReturn(Optional.of(persisted));

        Syllabus result = syllabusService.getSyllabus(
                "FORMACION PARA LA INVESTIGACION SISTEMAS", "sec-uuid", null, "token-utp");

        assertNotNull(result);
        assertEquals("100000SI82", result.getCourseCode());
        assertEquals(1, result.getWeeklySchedule().size());
        verify(utpPortalGateway, never()).fetchSyllabus(anyString(), anyString(), any(), any());
    }

    @Test
    @DisplayName("Un código de catálogo se resuelve por código y no dispara la búsqueda por nombre")
    void catalogCodeDoesNotTriggerNameLookup() {
        Syllabus persisted = completeSyllabus("100000ST61", "DESARROLLO WEB INTEGRADO");
        when(syllabusRepository.findByCourseCode("100000ST61")).thenReturn(Optional.of(persisted));

        Syllabus result = syllabusService.getSyllabus("100000ST61", "sec-uuid", null, "token-utp");

        assertEquals("100000ST61", result.getCourseCode());
        verify(syllabusRepository, never()).findByCourseName(anyString());
        verify(utpPortalGateway, never()).fetchSyllabus(anyString(), anyString(), any(), any());
    }

    @Test
    @DisplayName("Sin coincidencia local por nombre, se escala a la pasarela externa")
    void fallsBackToExternalGatewayWhenNameNotFoundLocally() {
        lenient().when(syllabusRepository.findByCourseCode(anyString())).thenReturn(Optional.empty());
        lenient().when(syllabusRepository.findByCourseName(anyString())).thenReturn(Optional.empty());
        Syllabus fetched = completeSyllabus("100000ST61", "DESARROLLO WEB INTEGRADO");
        when(utpPortalGateway.fetchSyllabus(anyString(), anyString(), any(), any())).thenReturn(fetched);
        lenient().when(syllabusRepository.save(any(Syllabus.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Syllabus result = syllabusService.getSyllabus("DESARROLLO WEB INTEGRADO", "sec-uuid", null, "token-utp");

        assertNotNull(result);
        assertEquals("100000ST61", result.getCourseCode());
        verify(utpPortalGateway).fetchSyllabus(anyString(), anyString(), any(), any());
    }

    @Test
    @DisplayName("Ni registro local incompleto ni pasarela vacía fabrican sílabo: se declara la ausencia")
    void unavailableSyllabusThrowsInsteadOfFabricating() {
        Syllabus incomplete = Syllabus.builder()
                .id("100000SI82")
                .courseCode("100000SI82")
                .courseName("FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS")
                .formula("")
                .weeklySchedule(List.of())
                .build();
        lenient().when(syllabusRepository.findByCourseCode(anyString())).thenReturn(Optional.empty());
        when(syllabusRepository.findByCourseName("FORMACION PARA LA INVESTIGACION SISTEMAS"))
                .thenReturn(Optional.of(incomplete));
        lenient().when(utpPortalGateway.fetchSyllabus(anyString(), anyString(), any(), any())).thenReturn(null);

        assertThrows(SyllabusUnavailableException.class, () -> syllabusService.getSyllabus(
                "FORMACION PARA LA INVESTIGACION SISTEMAS", "sec-uuid", null, "token-utp"));

        verify(utpPortalGateway).fetchSyllabus(anyString(), anyString(), any(), any());
        verify(syllabusRepository, never()).save(any(Syllabus.class));
    }

    @Test
    @DisplayName("Un courseCode en blanco no genera un sílabo 'UNKNOWN' fabricado")
    void blankCourseCodeIsRejectedWithoutFabricating() {
        assertThrows(IllegalArgumentException.class, () -> syllabusService.getSyllabus("   ", null, null, null));
        verify(utpPortalGateway, never()).fetchSyllabus(anyString(), anyString(), any(), any());
    }

    private Syllabus completeSyllabus(String code, String name) {
        return Syllabus.builder()
                .id(code)
                .courseCode(code)
                .courseName(name)
                .semester("2026 - Ciclo 2 Agosto")
                .credits(3)
                .modality("Presencial")
                .formula("(15%)ATI1 + (20%)ATI2 + (20%)ATI3 + (20%)PA + (25%)TI")
                .weeklySchedule(List.of(SyllabusWeeklySession.builder()
                        .week(1)
                        .session(1)
                        .unit("Unidad 1")
                        .topic("Planteamiento del Problema de Investigación")
                        .activities("Revisión bibliográfica")
                        .build()))
                .build();
    }
}
