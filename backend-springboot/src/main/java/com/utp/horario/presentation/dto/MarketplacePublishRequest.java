package com.utp.horario.presentation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketplacePublishRequest {
    private String itemType;
    private String category;
    private String serviceType;
    private String condition;
    private Double numericPrice;
    private String unit;
    private String title;
    private String description;
    private String imageUrl;
    private String location;
    private String contactMethod;
    private String tutorName;
    private String tutorCareer;
    private Integer tutorCycle;
}
