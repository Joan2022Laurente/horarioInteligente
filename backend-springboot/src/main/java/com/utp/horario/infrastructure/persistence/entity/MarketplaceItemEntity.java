package com.utp.horario.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "marketplace_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceItemEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "item_type", length = 32)
    private String itemType;

    @Column(nullable = false, length = 64)
    private String category;

    @Column(name = "service_type", length = 64)
    private String serviceType;

    @Column(name = "item_condition", length = 64)
    private String condition;

    @Column(length = 32)
    private String price;

    @Column(name = "numeric_price")
    private Double numericPrice;

    @Column(name = "original_price")
    private Double originalPrice;

    @Column(length = 32)
    private String unit;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(length = 64)
    private String badge;

    @Column(length = 128)
    private String location;

    private Double rating;

    @Column(name = "reviews_count")
    private Integer reviewsCount;

    @Column(name = "sales_count")
    private Integer salesCount;

    @Column(name = "tutor_name", length = 128)
    private String tutorName;

    @Column(name = "tutor_career", length = 128)
    private String tutorCareer;

    @Column(name = "tutor_cycle")
    private Integer tutorCycle;

    private Integer reputation;

    @Column(name = "contact_method", length = 255)
    private String contactMethod;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
