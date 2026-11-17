package com.utp.horario.interfaces.rest;

import com.utp.horario.application.command.PublishMarketplaceCommand;
import com.utp.horario.application.dtos.MarketplaceDto;
import com.utp.horario.application.handle.PublishMarketplaceCommandHandler;
import com.utp.horario.infrastructure.security.CurrentStudent;
import com.utp.horario.interfaces.rest.dto.ApiResponse;
import com.utp.horario.interfaces.rest.dto.MarketplacePublishRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "06. Marketplace Estudiantil", description = "Publicación y gestión de materiales académicos y tutorías")
@Slf4j
@RestController
@RequestMapping({"/marketplace", "/api/v1/marketplace"})
@RequiredArgsConstructor
public class MarketplaceController {

    private final PublishMarketplaceCommandHandler marketplaceCommandHandler;

    @Operation(summary = "Catálogo unificado con filtros por tipo, categoría, estado y búsqueda")
    @GetMapping
    public ResponseEntity<ApiResponse<List<MarketplaceDto>>> getItems(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String course) {
        List<MarketplaceDto> items = marketplaceCommandHandler.search(q, type, category, status, course);
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @Operation(summary = "Listado de publicaciones del estudiante autenticado")
    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<MarketplaceDto>>> getMyListings(
            @CurrentStudent String studentId) {
        List<MarketplaceDto> items = marketplaceCommandHandler.findByStudentCode(studentId);
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @Operation(summary = "Detalle de una publicación específica")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MarketplaceDto>> getItemById(@PathVariable String id) {
        return marketplaceCommandHandler.findById(id)
                .map(item -> ResponseEntity.ok(ApiResponse.ok(item)))
                .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.fail("Publicación no encontrada")));
    }

    @Operation(summary = "Transición de estado: AVAILABLE <-> RESERVED -> SOLD (productos) o AVAILABLE <-> PAUSED (servicios)")
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<MarketplaceDto>> updateStatus(
            @CurrentStudent String studentId,
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("El campo 'status' es obligatorio."));
        }
        try {
            return marketplaceCommandHandler.updateStatus(id, newStatus, studentId)
                    .map(updated -> ResponseEntity.ok(ApiResponse.ok("Estado actualizado correctamente", updated)))
                    .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.fail("Publicación no encontrada")));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail(e.getMessage()));
        }
    }

    @Operation(summary = "Registra intención de contacto y devuelve deep links seguros (Teams / WhatsApp)")
    @PostMapping("/{id}/contact")
    public ResponseEntity<ApiResponse<Map<String, String>>> getContactHandshake(
            @CurrentStudent(required = false) String studentId,
            @PathVariable String id) {
        return marketplaceCommandHandler.findById(id).map(item -> {
            String tutor = item.getTutorName() != null ? item.getTutorName() : "Estudiante UTP";
            String title = item.getTitle() != null ? item.getTitle() : "publicación";
            String contactRaw = item.getContactMethod() != null ? item.getContactMethod() : "";

            String teamsEmail = contactRaw.contains("@utp.edu.pe")
                    ? contactRaw.replaceAll(".*([uU]\\d{8}@utp\\.edu\\.pe).*", "$1")
                    : (tutor.matches("[uU]\\d{8}") ? tutor + "@utp.edu.pe" : "contacto@utp.edu.pe");

            String teamsUrl = "https://teams.microsoft.com/l/chat/0/0?users=" + URLEncoder.encode(teamsEmail, StandardCharsets.UTF_8);
            String message = String.format("Hola %s, vi tu publicación de '%s' en el Marketplace de Horario UTP y me interesa coordinar.", tutor, title);

            Map<String, String> response = new LinkedHashMap<>();
            response.put("sellerName", tutor);
            response.put("teamsEmail", teamsEmail);
            response.put("teamsUrl", teamsUrl);
            response.put("prefilledMessage", message);

            return ResponseEntity.ok(ApiResponse.ok("Handshake institucional generado", response));
        }).orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.fail("Publicación no encontrada")));
    }

    @Operation(summary = "Eliminar publicación propia")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(@PathVariable String id) {
        boolean deleted = marketplaceCommandHandler.delete(id);
        if (!deleted) {
            return ResponseEntity.status(404).body(ApiResponse.fail("Publicación no encontrada o ya eliminada"));
        }
        return ResponseEntity.ok(ApiResponse.ok("Publicación eliminada exitosamente", null));
    }

    @Operation(summary = "Publicar un nuevo producto o servicio en el marketplace")
    @PostMapping({"", "/publish"})
    public ResponseEntity<ApiResponse<MarketplaceDto>> publishItem(
            @CurrentStudent(required = false) String currentStudentId,
            @RequestBody MarketplacePublishRequest request) {
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("El título es obligatorio"));
        }

        Double priceVal = request.getNumericPrice() != null ? request.getNumericPrice() : 0.0;
        String formattedPrice = String.format("S/ %.2f", priceVal);

        String effectiveTutor = (request.getTutorName() != null && !request.getTutorName().isBlank())
                ? request.getTutorName()
                : (currentStudentId != null ? currentStudentId : "Estudiante UTP");

        PublishMarketplaceCommand command = PublishMarketplaceCommand.builder()
                .itemType(request.getItemType() != null ? request.getItemType() : "PRODUCT")
                .category(request.getCategory() != null ? request.getCategory() : "CLOTHING_THRIFT")
                .serviceType(request.getServiceType() != null ? request.getServiceType() : "General")
                .condition(request.getCondition() != null ? request.getCondition() : "SEMINUEVO")
                .price(formattedPrice)
                .numericPrice(priceVal)
                .originalPrice(priceVal)
                .unit(request.getUnit() != null ? request.getUnit() : "/ unidad")
                .title(request.getTitle())
                .description(request.getDescription() != null ? request.getDescription() : "")
                .imageUrl(request.getImageUrl() != null && !request.getImageUrl().isBlank()
                        ? request.getImageUrl()
                        : "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop")
                .badge("NUEVO")
                .location(request.getLocation() != null ? request.getLocation() : "Campus UTP")
                .tutorName(effectiveTutor)
                .tutorCareer(request.getTutorCareer() != null ? request.getTutorCareer() : "Ingeniería")
                .tutorCycle(request.getTutorCycle() != null ? request.getTutorCycle() : 1)
                .contactMethod(request.getContactMethod() != null ? request.getContactMethod() : "Coordinación en campus")
                .build();

        MarketplaceDto saved = marketplaceCommandHandler.handle(command);
        log.info("[MarketplaceController] ✅ Nueva publicación registrada en base de datos: {} ({})", saved.getTitle(), saved.getId());
        return ResponseEntity.ok(ApiResponse.ok("Publicación creada exitosamente", saved));
    }
}
