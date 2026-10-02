package com.utp.horario.application.command;

import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
@Builder
public class PublishMarketplaceCommand {
    private final String itemType;
    private final String category;
    private final String serviceType;
    private final String condition;
    private final String price;
    private final Double numericPrice;
    private final Double originalPrice;
    private final String unit;
    private final String title;
    private final String description;
    private final String imageUrl;
    private final String badge;
    private final String location;
    private final String tutorName;
    private final String tutorCareer;
    private final Integer tutorCycle;
    private final String contactMethod;
}
