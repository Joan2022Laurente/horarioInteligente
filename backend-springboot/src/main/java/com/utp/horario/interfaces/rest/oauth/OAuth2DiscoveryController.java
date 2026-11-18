package com.utp.horario.interfaces.rest.oauth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Controladores de Discovery estándar para clientes OAuth 2.1 / MCP Web (RFC 9728 y RFC 8414).
 * Permite que Claude Web y ChatGPT Web detecten de forma autónoma la metadata del servidor de autorización.
 */
@RestController
@RequestMapping
public class OAuth2DiscoveryController {

    /**
     * RFC 9728: OAuth 2.0 Protected Resource Metadata.
     * Permite a los clientes MCP descubrir qué Authorization Server protege al endpoint /mcp.
     */
    @GetMapping(value = "/.well-known/oauth-protected-resource", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> getProtectedResourceMetadata(HttpServletRequest request) {
        String baseUrl = resolveBaseUrl(request);
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("resource", baseUrl + "/mcp");
        metadata.put("authorization_servers", List.of(baseUrl));
        metadata.put("scopes_supported", List.of("mcp:read", "offline_access"));
        metadata.put("bearer_methods_supported", List.of("header"));
        return ResponseEntity.ok(metadata);
    }

    /**
     * RFC 8414: OAuth 2.0 Authorization Server Metadata.
     * Describe las capacidades OAuth 2.1 (PKCE S256, DCR, endpoints de authorize y token).
     */
    @GetMapping(value = "/.well-known/oauth-authorization-server", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> getAuthorizationServerMetadata(HttpServletRequest request) {
        String baseUrl = resolveBaseUrl(request);
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("issuer", baseUrl);
        metadata.put("authorization_endpoint", baseUrl + "/oauth/authorize");
        metadata.put("token_endpoint", baseUrl + "/oauth/token");
        metadata.put("registration_endpoint", baseUrl + "/oauth/register");
        metadata.put("response_types_supported", List.of("code"));
        metadata.put("grant_types_supported", List.of("authorization_code", "refresh_token"));
        metadata.put("code_challenge_methods_supported", List.of("S256"));
        metadata.put("token_endpoint_auth_methods_supported", List.of("client_secret_post", "none"));
        metadata.put("scopes_supported", List.of("mcp:read", "offline_access"));
        return ResponseEntity.ok(metadata);
    }

    private String resolveBaseUrl(HttpServletRequest request) {
        return ServletUriComponentsBuilder.fromContextPath(request).build().toUriString();
    }
}
