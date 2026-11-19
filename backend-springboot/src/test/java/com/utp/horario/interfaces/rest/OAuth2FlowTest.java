package com.utp.horario.interfaces.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.application.handle.AuthenticateStudentCommandHandler;
import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.infrastructure.security.SecurityConfig;
import com.utp.horario.interfaces.rest.oauth.OAuth2AuthorizationController;
import com.utp.horario.interfaces.rest.oauth.OAuth2DiscoveryController;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {OAuth2DiscoveryController.class, OAuth2AuthorizationController.class})
@Import(SecurityConfig.class)
class OAuth2FlowTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthenticateStudentCommandHandler authCommandHandler;

    @MockBean
    private com.utp.horario.infrastructure.security.SecurityIdentityResolver identityResolver;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("RFC 9728: Discovery de recurso protegido retorna metadata correcta")
    void discoveryProtectedResourceReturnsMetadata() throws Exception {
        mockMvc.perform(get("/.well-known/oauth-protected-resource"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.resource").exists())
                .andExpect(jsonPath("$.authorization_servers").isArray());
    }

    @Test
    @DisplayName("RFC 8414: Discovery de authorization server incluye S256 y endpoints obligatorios")
    void discoveryAuthServerIncludesS256() throws Exception {
        mockMvc.perform(get("/.well-known/oauth-authorization-server"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.issuer").exists())
                .andExpect(jsonPath("$.authorization_endpoint").exists())
                .andExpect(jsonPath("$.token_endpoint").exists())
                .andExpect(jsonPath("$.code_challenge_methods_supported[0]").value("S256"));
    }

    @Test
    @DisplayName("RFC 7591: DCR registra cliente para Claude Web con 201 Created")
    void dynamicClientRegistrationForClaudeWeb() throws Exception {
        Map<String, Object> regRequest = Map.of(
                "client_name", "Claude Web",
                "redirect_uris", List.of("https://claude.ai/api/mcp/auth_callback")
        );

        mockMvc.perform(post("/oauth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.client_id").exists())
                .andExpect(jsonPath("$.client_name").value("Claude Web"))
                .andExpect(jsonPath("$.redirect_uris[0]").value("https://claude.ai/api/mcp/auth_callback"));
    }

    @Test
    @DisplayName("RFC 7591: DCR registra cliente para Google Gemini Web (sandbox y prod) con 201 Created")
    void dynamicClientRegistrationForGoogleGeminiWeb() throws Exception {
        Map<String, Object> regRequest = Map.of(
                "client_name", "Google Gemini Web",
                "redirect_uris", List.of("https://oauth-redirect-sandbox.googleusercontent.com/r/user_bound_custom-mcp-e807e9e1ae8ba2926a525488")
        );

        mockMvc.perform(post("/oauth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.client_id").exists())
                .andExpect(jsonPath("$.client_name").value("Google Gemini Web"))
                .andExpect(jsonPath("$.redirect_uris[0]").value("https://oauth-redirect-sandbox.googleusercontent.com/r/user_bound_custom-mcp-e807e9e1ae8ba2926a525488"));
    }

    @Test
    @DisplayName("GET /oauth/authorize renderiza formulario de login con campos ocultos")
    void authorizeRendersHtmlForm() throws Exception {
        mockMvc.perform(get("/oauth/authorize")
                        .param("response_type", "code")
                        .param("client_id", "claude-web")
                        .param("redirect_uri", "https://claude.ai/api/mcp/auth_callback")
                        .param("state", "xyzState123")
                        .param("code_challenge", "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
                        .param("code_challenge_method", "S256"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("utopik")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("name=\"username\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("name=\"password\"")));
    }

    @Test
    @DisplayName("POST /oauth/authorize con credenciales válidas genera redirect 302 con code y state")
    void authorizeWithValidCredentialsRedirects() throws Exception {
        StudentProfile mockProfile = new StudentProfile();
        mockProfile.setStudentCode("U23307609");
        when(authCommandHandler.handle(any())).thenReturn(mockProfile);

        mockMvc.perform(post("/oauth/authorize")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("username", "U23307609")
                        .param("password", "secret123")
                        .param("client_id", "claude-web")
                        .param("redirect_uri", "https://claude.ai/api/mcp/auth_callback")
                        .param("state", "xyzState123")
                        .param("code_challenge", "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
                        .param("code_challenge_method", "S256"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", org.hamcrest.Matchers.containsString("https://claude.ai/api/mcp/auth_callback?code=")))
                .andExpect(header().string("Location", org.hamcrest.Matchers.containsString("state=xyzState123")));
    }
}
