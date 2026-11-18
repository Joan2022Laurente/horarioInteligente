package com.utp.horario.interfaces.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.domain.model.repositories.IStudentRepository;
import com.utp.horario.infrastructure.security.CurrentStudentArgumentResolver;
import com.utp.horario.infrastructure.security.SecurityIdentityResolver;
import com.utp.horario.interfaces.rest.dto.UpdateProfileRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProfileControllerTest {

    private static final String BEARER =
            "Bearer eyJhbGciOiJIUzI1NiJ9.eyJwcmVmZXJyZWRfdXNlcm5hbWUiOiJVMjMzMDc2MDkiLCJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl";

    @Mock
    private IStudentRepository studentRepository;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        SecurityIdentityResolver identityResolver = new SecurityIdentityResolver(objectMapper);
        CurrentStudentArgumentResolver argumentResolver = new CurrentStudentArgumentResolver(identityResolver);

        ProfileController controller = new ProfileController(studentRepository);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(argumentResolver)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/profile/me devuelve 200 con la entidad de estudiante")
    void getMyProfileSuccess() throws Exception {
        StudentProfile student = StudentProfile.builder()
                .id("usr-u23307609")
                .studentCode("U23307609")
                .fullName("JOAN JOAQUIN CALLANAUPA LAURENTE")
                .email("u23307609@utp.edu.pe")
                .career("ING. DE SISTEMAS")
                .campus("Campus Lima Centro")
                .currentCycle(7)
                .phoneWhatsapp("987654321")
                .avatarUrl("https://supabase.co/avatar.webp")
                .build();

        when(studentRepository.findByStudentCode("U23307609")).thenReturn(Optional.of(student));

        mockMvc.perform(get("/api/v1/profile/me")
                        .header("Authorization", BEARER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.studentCode").value("U23307609"))
                .andExpect(jsonPath("$.data.phoneWhatsapp").value("987654321"))
                .andExpect(jsonPath("$.data.avatarUrl").value("https://supabase.co/avatar.webp"));
    }

    @Test
    @DisplayName("PUT /api/v1/profile/me actualiza WhatsApp, avatar y enlace social exitosamente")
    void updateProfileSuccess() throws Exception {
        StudentProfile existing = StudentProfile.builder()
                .id("usr-u23307609")
                .studentCode("U23307609")
                .fullName("JOAN JOAQUIN CALLANAUPA LAURENTE")
                .email("u23307609@utp.edu.pe")
                .build();

        when(studentRepository.findByStudentCode("U23307609")).thenReturn(Optional.of(existing));
        when(studentRepository.save(any(StudentProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .phoneWhatsapp("991234567")
                .avatarUrl("https://flsvdobbrtvpzyatusis.supabase.co/avatar.webp")
                .socialLink("https://linkedin.com/in/joan-laurente")
                .campusLocation("Torre A - Piso 3")
                .bio("Desarrollador backend y cloud.")
                .build();

        mockMvc.perform(put("/api/v1/profile/me")
                        .header("Authorization", BEARER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.phoneWhatsapp").value("991234567"))
                .andExpect(jsonPath("$.data.campusLocation").value("Torre A - Piso 3"))
                .andExpect(jsonPath("$.data.bio").value("Desarrollador backend y cloud."));
    }

    @Test
    @DisplayName("PUT /api/v1/profile/me con formato de WhatsApp inválido devuelve 400 Bad Request")
    void updateProfileInvalidPhoneFails() throws Exception {
        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .phoneWhatsapp("12345") // Inválido: debe ser 9 dígitos y empezar con 9
                .build();

        mockMvc.perform(put("/api/v1/profile/me")
                        .header("Authorization", BEARER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/v1/profile/me sin Authorization Header devuelve 401/403")
    void getProfileUnauthenticatedFails() throws Exception {
        mockMvc.perform(get("/api/v1/profile/me"))
                .andExpect(status().is4xxClientError());
    }
}
