package com.utp.horario.presentation.controller;

import com.utp.horario.infrastructure.persistence.entity.MarketplaceItemEntity;
import com.utp.horario.infrastructure.persistence.repository.SpringDataMarketplaceRepository;
import com.utp.horario.presentation.dto.ApiResponse;
import com.utp.horario.presentation.dto.MarketplacePublishRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/marketplace")
@RequiredArgsConstructor
public class MarketplaceController {

    private final SpringDataMarketplaceRepository marketplaceRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MarketplaceItemEntity>>> getItems(
            @RequestParam(required = false) String category) {
        List<MarketplaceItemEntity> items;
        if (category != null && !category.isBlank() && !category.equalsIgnoreCase("ALL")) {
            items = marketplaceRepository.findByCategoryIgnoreCase(category);
        } else {
            items = marketplaceRepository.findAllByOrderByCreatedAtDesc();
        }
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MarketplaceItemEntity>> getItemById(@PathVariable String id) {
        return marketplaceRepository.findById(id)
                .map(item -> ResponseEntity.ok(ApiResponse.ok(item)))
                .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.fail("Publicación no encontrada")));
    }

    @PostMapping("/publish")
    public ResponseEntity<ApiResponse<MarketplaceItemEntity>> publishItem(@RequestBody MarketplacePublishRequest request) {
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("El título es obligatorio"));
        }

        String id = "m-" + UUID.randomUUID().toString().substring(0, 8);
        Double priceVal = request.getNumericPrice() != null ? request.getNumericPrice() : 0.0;
        String formattedPrice = String.format("S/ %.2f", priceVal);

        MarketplaceItemEntity entity = MarketplaceItemEntity.builder()
                .id(id)
                .itemType(request.getItemType() != null ? request.getItemType() : "PRODUCT")
                .category(request.getCategory() != null ? request.getCategory() : "CLOTHING_THRIFT")
                .serviceType(request.getServiceType() != null ? request.getServiceType() : "General")
                .condition(request.getCondition() != null ? request.getCondition() : "SEMINUEVO")
                .numericPrice(priceVal)
                .price(formattedPrice)
                .unit(request.getUnit() != null ? request.getUnit() : "/ unidad")
                .title(request.getTitle())
                .description(request.getDescription() != null ? request.getDescription() : "")
                .imageUrl(request.getImageUrl() != null && !request.getImageUrl().isBlank()
                        ? request.getImageUrl()
                        : "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop")
                .badge("NUEVO")
                .location(request.getLocation() != null ? request.getLocation() : "Campus UTP")
                .rating(5.0)
                .reviewsCount(0)
                .salesCount(0)
                .tutorName(request.getTutorName() != null ? request.getTutorName() : "Estudiante UTP")
                .tutorCareer(request.getTutorCareer() != null ? request.getTutorCareer() : "Ingeniería")
                .tutorCycle(request.getTutorCycle() != null ? request.getTutorCycle() : 1)
                .reputation(100)
                .contactMethod(request.getContactMethod() != null ? request.getContactMethod() : "Coordinación en campus")
                .createdAt(LocalDateTime.now())
                .build();

        MarketplaceItemEntity saved = marketplaceRepository.save(entity);
        log.info("[MarketplaceController] ✅ Nueva publicación registrada en base de datos: {} ({})", saved.getTitle(), saved.getId());
        return ResponseEntity.ok(ApiResponse.ok("Publicación creada exitosamente", saved));
    }
}
