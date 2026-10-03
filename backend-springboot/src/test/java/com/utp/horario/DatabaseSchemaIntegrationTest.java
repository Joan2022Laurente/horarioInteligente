package com.utp.horario;

import com.utp.horario.application.command.PublishMarketplaceCommand;
import com.utp.horario.application.dtos.MarketplaceDto;
import com.utp.horario.application.handle.PublishMarketplaceCommandHandler;
import com.utp.horario.domain.model.repositories.IMarketplaceRepository;
import com.utp.horario.domain.model.repositories.IScheduleRepository;
import com.utp.horario.domain.model.repositories.IStudentRepository;
import com.utp.horario.domain.model.repositories.ISyllabusRepository;
import com.utp.horario.domain.model.repositories.ITaskSyncRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import javax.sql.DataSource;
import java.io.File;
import java.sql.Connection;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "MYSQL_URL", matches = ".*")
public class DatabaseSchemaIntegrationTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private IStudentRepository studentRepository;

    @Autowired
    private ISyllabusRepository syllabusRepository;

    @Autowired
    private ITaskSyncRepository taskSyncRepository;

    @Autowired
    private IMarketplaceRepository marketplaceRepository;

    @Autowired
    private IScheduleRepository scheduleRepository;

    @Autowired
    private PublishMarketplaceCommandHandler marketplaceCommandHandler;

    @Test
    @DisplayName("Ejecuta DDL completo y valida persistencia en todos los repositorios MySQL")
    void testCompleteDatabaseSchemaAndRepositories() throws Exception {
        // 1. Localizar y ejecutar schema_mysql_workbench.sql
        File schemaFile = new File("../docs/database/schema_mysql_workbench.sql");
        if (!schemaFile.exists()) {
            schemaFile = new File("docs/database/schema_mysql_workbench.sql");
        }
        assertTrue(schemaFile.exists(), "El archivo schema_mysql_workbench.sql debe existir");

        try (Connection conn = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(conn, new FileSystemResource(schemaFile));
        }

        // 2. Validar Estudiante
        var studentOpt = studentRepository.findByStudentCode("U23307609");
        assertTrue(studentOpt.isPresent(), "El estudiante U23307609 debe existir");
        assertTrue(studentOpt.get().getFullName().contains("CALLA"), "El nombre debe coincidir");

        // 3. Validar Sílabo
        var syllabusOpt = syllabusRepository.findByCourseCode("100000SI58");
        assertTrue(syllabusOpt.isPresent(), "El sílabo 100000SI58 debe existir");
        assertTrue(syllabusOpt.get().getFormula().contains("15% [PC1]"));

        // 4. Validar Tareas
        var tasks = taskSyncRepository.findByStudentId("U23307609");
        assertFalse(tasks.isEmpty(), "Las tareas sincronizadas no deben estar vacías");
        assertEquals(3, tasks.size());

        // 5. Validar Marketplace (Lectura de Seed Data)
        var items = marketplaceRepository.list();
        assertFalse(items.isEmpty(), "Los items de marketplace no deben estar vacíos");

        // 6. Validar Publicación en Marketplace (Escritura en MySQL)
        PublishMarketplaceCommand cmd = PublishMarketplaceCommand.builder()
                .title("Guía Avanzada DDD en Spring Boot")
                .description("Ejemplos completos de arquitectura hexagonal")
                .numericPrice(20.0)
                .category("MATERIAL")
                .itemType("PRODUCT")
                .tutorName("Joan Callañaupa")
                .location("Campus Lima Centro")
                .price("S/ 20.00")
                .build();

        MarketplaceDto published = marketplaceCommandHandler.handle(cmd);
        assertNotNull(published);
        assertNotNull(published.getId());
        assertEquals("Guía Avanzada DDD en Spring Boot", published.getTitle());

        // 7. Verificar que el nuevo item está persistido en la BD
        var foundOpt = marketplaceRepository.findById(published.getId());
        assertTrue(foundOpt.isPresent(), "El item publicado debe encontrarse en MySQL");
        assertEquals(20.0, foundOpt.get().getNumericPrice());

        // 8. Validar Horario
        var scheduleOpt = scheduleRepository.findByStudentIdAndPeriod("U23307609", "2026 - Ciclo 2 Agosto");
        assertTrue(scheduleOpt.isPresent(), "El horario sincronizado debe existir");
    }
}
