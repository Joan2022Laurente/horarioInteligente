package com.utp.horario.interfaces.rest;

import com.utp.horario.application.assembler.MarketplaceAssembler;
import com.utp.horario.application.command.PublishMarketplaceCommand;
import com.utp.horario.application.dtos.MarketplaceDto;
import com.utp.horario.application.handle.PublishMarketplaceCommandHandler;
import com.utp.horario.domain.model.repositories.IMarketplaceRepository;
import com.utp.horario.interfaces.rest.dto.ApiResponse;
import com.utp.horario.interfaces.rest.dto.MarketplacePublishRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping({"/marketplace", "/api/v1/marketplace"})
@RequiredArgsConstructor
public class MarketplaceController {

    private final PublishMarketplaceCommandHandler marketplaceCommandHandler;
    private final IMarketplaceRepository marketplaceRepository;
    private final MarketplaceAssembler marketplaceAssembler;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MarketplaceDto>>> getItems(
            @RequestParam(required = false) String category) {
        List<MarketplaceDto> items;
        if (category != null && !category.isBlank() && !category.equalsIgnoreCase("ALL")) {
            items = marketplaceCommandHandler.findByCategory(category);
        } else {
            items = marketplaceCommandHandler.listAll();
        }
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MarketplaceDto>> getItemById(@PathVariable String id) {
        return marketplaceRepository.findById(id)
                .map(marketplaceAssembler::toDto)
                .map(item -> ResponseEntity.ok(ApiResponse.ok(item)))
                .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.fail("Publicación no encontrada")));
    }

    @PostMapping("/publish")
    public ResponseEntity<ApiResponse<MarketplaceDto>> publishItem(@RequestBody MarketplacePublishRequest request) {
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("El título es obligatorio"));
        }

        Double priceVal = request.getNumericPrice() != null ? request.getNumericPrice() : 0.0;
        String formattedPrice = String.format("S/ %.2f", priceVal);

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
                .tutorName(request.getTutorName() != null ? request.getTutorName() : "Estudiante UTP")
                .tutorCareer(request.getTutorCareer() != null ? request.getTutorCareer() : "Ingeniería")
                .tutorCycle(request.getTutorCycle() != null ? request.getTutorCycle() : 1)
                .contactMethod(request.getContactMethod() != null ? request.getContactMethod() : "Coordinación en campus")
                .build();

        MarketplaceDto saved = marketplaceCommandHandler.handle(command);
        log.info("[MarketplaceController] ✅ Nueva publicación registrada en base de datos: {} ({})", saved.getTitle(), saved.getId());
        return ResponseEntity.ok(ApiResponse.ok("Publicación creada exitosamente", saved));
    }
}
