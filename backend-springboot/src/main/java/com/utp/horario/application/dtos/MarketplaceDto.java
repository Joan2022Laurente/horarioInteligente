package com.utp.horario.application.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceDto {
    private String id;
    private String itemType;
    private String category;
    private String serviceType;
    private String condition;
    private String price;
    private Double numericPrice;
    private Double originalPrice;
    private String unit;
    private String title;
    private String description;
    private String imageUrl;
    private String badge;
    private String location;
    private Double rating;
    private Integer reviewsCount;
    private Integer salesCount;
    private String tutorName;
    private String tutorCareer;
    private Integer tutorCycle;
    private Integer reputation;
    private String contactMethod;
    private LocalDateTime createdAt;
}
