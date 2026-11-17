package com.utp.horario.infrastructure.web;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Horario Inteligente UTP - API Core & Copiloto Académico")
                        .version("1.0.0")
                        .description("Backend DDD con CQRS, Asistente IA con OpenRouter Failover, Servidor MCP y Networking Presencial Universitario.")
                        .contact(new Contact()
                                .name("Horario Inteligente UTP Team")
                                .email("soporte@horario-utp.edu.pe"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")))
                .servers(List.of(
                        new Server().url("/").description("Servidor Actual (Local / Producción Heroku)")
                ))
                .tags(List.of(
                        new Tag().name("01. Autenticación").description("Sesión de estudiante, SSO y auto-bootstrap"),
                        new Tag().name("02. Horarios y Clases").description("Consulta de horario oficial, clases de hoy y clases restantes"),
                        new Tag().name("03. Tareas y Actividades").description("Sincronización y consulta de tareas académicas y evaluaciones oficiales"),
                        new Tag().name("04. Sílabos Oficiales").description("Consulta de temarios semanales y fórmulas de evaluación"),
                        new Tag().name("05. Networking Presencial").description("Mesas de estudio en campus (Study Beacons) y Matching Dual"),
                        new Tag().name("06. Marketplace Estudiantil").description("Publicación y gestión de materiales, libros y tutorías"),
                        new Tag().name("07. Copiloto IA & MCP").description("Orquestación multi-modelo OpenRouter y Model Context Protocol"),
                        new Tag().name("08. Sistema & Health").description("Verificación de estado y salud del sistema")
                ))
                .addSecurityItem(new SecurityRequirement().addList("BearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("BearerAuth", new SecurityScheme()
                                .name("BearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Token JWT Bearer del estudiante (enviar sin comillas)")));
    }
}
