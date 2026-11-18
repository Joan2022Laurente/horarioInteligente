package com.utp.horario.infrastructure.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "students")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentEntity {
    @Id
    private String id;
    private String studentCode;
    private String fullName;
    private String email;
    private String career;
    private String campus;
    private Integer currentCycle;

    @jakarta.persistence.Column(name = "phone_whatsapp", length = 20)
    private String phoneWhatsapp;

    @jakarta.persistence.Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @jakarta.persistence.Column(name = "social_link", length = 255)
    private String socialLink;

    @jakarta.persistence.Column(name = "campus_location", length = 100)
    private String campusLocation;

    @jakarta.persistence.Column(name = "bio", length = 160)
    private String bio;
}

