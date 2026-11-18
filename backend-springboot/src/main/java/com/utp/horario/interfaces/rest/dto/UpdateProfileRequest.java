package com.utp.horario.interfaces.rest.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Solicitud para actualizar canales de contacto y perfil comercial del estudiante")
public class UpdateProfileRequest {

    @Schema(description = "Número de WhatsApp del estudiante (9 dígitos comenzando con 9, formato Perú)", example = "987654321")
    @Pattern(regexp = "^$|^9\\d{8}$", message = "El número de WhatsApp debe tener 9 dígitos y comenzar con 9 (formato Perú)")
    private String phoneWhatsapp;

    @Schema(description = "URL pública de la foto de perfil o avatar", example = "https://flsvdobbrtvpzyatusis.supabase.co/storage/v1/object/public/marketplace/avatars/user.webp")
    @Size(max = 500, message = "La URL del avatar no puede exceder 500 caracteres")
    @Pattern(regexp = "^$|^(https?://).*", message = "La URL del avatar debe comenzar con http:// o https://")
    private String avatarUrl;

    @Schema(description = "Enlace a red social o portafolio (LinkedIn, GitHub o Instagram)", example = "https://linkedin.com/in/usuario")
    @Size(max = 255, message = "El enlace social o portafolio no puede exceder 255 caracteres")
    @Pattern(regexp = "^$|^(https?://).*", message = "El enlace social debe comenzar con http:// o https://")
    private String socialLink;

    @Schema(description = "Punto habitual de encuentro o entrega en campus", example = "Torre A - Piso 3")
    @Size(max = 100, message = "El punto de encuentro en campus no puede exceder 100 caracteres")
    private String campusLocation;

    @Schema(description = "Breve biografía o descripción de presentación", example = "Estudiante de Ing. de Sistemas y desarrollador apasionado por la nube.")
    @Size(max = 160, message = "La biografía no puede exceder 160 caracteres")
    private String bio;
}
