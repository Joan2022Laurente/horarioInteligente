package com.utp.horario.infrastructure.mappers;

import com.utp.horario.domain.model.aggregate.MarketplaceItem;
import com.utp.horario.infrastructure.entities.MarketplaceItemEntity;
import org.springframework.stereotype.Component;

@Component
public class MarketplaceMapper {

    public MarketplaceItem toDomain(MarketplaceItemEntity entity) {
        if (entity == null) return null;
        return MarketplaceItem.builder()
                .id(entity.getId())
                .itemType(entity.getItemType())
                .category(entity.getCategory())
                .serviceType(entity.getServiceType())
                .condition(entity.getCondition())
                .price(entity.getPrice())
                .numericPrice(entity.getNumericPrice())
                .originalPrice(entity.getOriginalPrice())
                .unit(entity.getUnit())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .imageUrl(entity.getImageUrl())
                .thumbnailUrl(entity.getThumbnailUrl() != null && !entity.getThumbnailUrl().isBlank() ? entity.getThumbnailUrl() : entity.getImageUrl())
                .badge(entity.getBadge())
                .location(entity.getLocation())
                .rating(entity.getRating())
                .reviewsCount(entity.getReviewsCount())
                .salesCount(entity.getSalesCount())
                .tutorName(entity.getTutorName())
                .tutorCareer(entity.getTutorCareer())
                .tutorCycle(entity.getTutorCycle())
                .reputation(entity.getReputation())
                .contactMethod(entity.getContactMethod())
                .status(entity.getStatus() != null ? entity.getStatus() : "AVAILABLE")
                .createdAt(entity.getCreatedAt())
                .build();
    }

    public MarketplaceItemEntity toEntity(MarketplaceItem domain) {
        if (domain == null) return null;
        return MarketplaceItemEntity.builder()
                .id(domain.getId())
                .itemType(domain.getItemType())
                .category(domain.getCategory())
                .serviceType(domain.getServiceType())
                .condition(domain.getCondition())
                .price(domain.getPrice())
                .numericPrice(domain.getNumericPrice())
                .originalPrice(domain.getOriginalPrice())
                .unit(domain.getUnit())
                .title(domain.getTitle())
                .description(domain.getDescription())
                .imageUrl(domain.getImageUrl())
                .thumbnailUrl(domain.getThumbnailUrl())
                .badge(domain.getBadge())
                .location(domain.getLocation())
                .rating(domain.getRating())
                .reviewsCount(domain.getReviewsCount())
                .salesCount(domain.getSalesCount())
                .tutorName(domain.getTutorName())
                .tutorCareer(domain.getTutorCareer())
                .tutorCycle(domain.getTutorCycle())
                .reputation(domain.getReputation())
                .contactMethod(domain.getContactMethod())
                .status(domain.getStatus() != null ? domain.getStatus() : "AVAILABLE")
                .createdAt(domain.getCreatedAt())
                .build();
    }
}

