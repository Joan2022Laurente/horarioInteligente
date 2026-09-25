package com.utp.horario.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceItem {
    private String id;
    private String itemType;       // 'PRODUCT' | 'SERVICE'
    private String category;       // 'FOOD', 'ACADEMIC', 'TECH_DESIGN', 'CLOTHING_THRIFT', etc.
    private String serviceType;    // Subtipo legible (ej. 'Ropa & Hoodies', 'Asesoría')
    private String condition;      // 'NUEVO', 'SEMINUEVO 9/10', etc.
    private String price;          // 'S/ 45.00'
    private Double numericPrice;   // 45.00
    private Double originalPrice;  // Opcional
    private String unit;           // '/ prenda', '/ hora'
    private String title;
    private String description;
    private String imageUrl;
    private String badge;
    private String location;       // 'Torre A - Piso 3'
    private Double rating;
    private Integer reviewsCount;
    private Integer salesCount;
    private String tutorName;      // Vendedor / Tutor
    private String tutorCareer;
    private Integer tutorCycle;
    private Integer reputation;
    private String contactMethod;
    private LocalDateTime createdAt;
}
