package com.utp.horario.application.assembler;

import com.utp.horario.application.command.PublishMarketplaceCommand;
import com.utp.horario.application.dtos.MarketplaceDto;
import com.utp.horario.domain.model.aggregate.MarketplaceItem;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
public class MarketplaceAssembler {

    public MarketplaceItem toDomain(PublishMarketplaceCommand cmd) {
        if (cmd == null) return null;
        return MarketplaceItem.builder()
                .id(UUID.randomUUID().toString())
                .itemType(cmd.getItemType())
                .category(cmd.getCategory())
                .serviceType(cmd.getServiceType())
                .condition(cmd.getCondition())
                .price(cmd.getPrice())
                .numericPrice(cmd.getNumericPrice())
                .originalPrice(cmd.getOriginalPrice())
                .unit(cmd.getUnit())
                .title(cmd.getTitle())
                .description(cmd.getDescription())
                .imageUrl(cmd.getImageUrl())
                .badge(cmd.getBadge())
                .location(cmd.getLocation())
                .tutorName(cmd.getTutorName())
                .tutorCareer(cmd.getTutorCareer())
                .tutorCycle(cmd.getTutorCycle())
                .contactMethod(cmd.getContactMethod())
                .rating(5.0)
                .reviewsCount(0)
                .salesCount(0)
                .reputation(100)
                .createdAt(LocalDateTime.now())
                .build();
    }

    public MarketplaceDto toDto(MarketplaceItem item) {
        if (item == null) return null;
        return MarketplaceDto.builder()
                .id(item.getId())
                .itemType(item.getItemType())
                .category(item.getCategory())
                .serviceType(item.getServiceType())
                .condition(item.getCondition())
                .price(item.getPrice())
                .numericPrice(item.getNumericPrice())
                .originalPrice(item.getOriginalPrice())
                .unit(item.getUnit())
                .title(item.getTitle())
                .description(item.getDescription())
                .imageUrl(item.getImageUrl())
                .badge(item.getBadge())
                .location(item.getLocation())
                .rating(item.getRating())
                .reviewsCount(item.getReviewsCount())
                .salesCount(item.getSalesCount())
                .tutorName(item.getTutorName())
                .tutorCareer(item.getTutorCareer())
                .tutorCycle(item.getTutorCycle())
                .reputation(item.getReputation())
                .contactMethod(item.getContactMethod())
                .createdAt(item.getCreatedAt())
                .build();
    }
}
