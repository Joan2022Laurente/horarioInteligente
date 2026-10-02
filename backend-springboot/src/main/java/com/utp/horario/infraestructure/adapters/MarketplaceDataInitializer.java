package com.utp.horario.infraestructure.adapters;

import com.utp.horario.infraestructure.entities.MarketplaceItemEntity;
import com.utp.horario.infraestructure.repositories.JPAMarketplaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Semilla inicial que puebla la base de datos de marketplace si estÃ¡ vacÃ­a.
 */
@Slf4j
@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
        name = "app.marketplace.seed-enabled",
        havingValue = "true",
        matchIfMissing = false
)
@RequiredArgsConstructor
public class MarketplaceDataInitializer implements CommandLineRunner {

    private final JPAMarketplaceRepository repository;

    @Override
    public void run(String... args) {
        if (repository.count() > 0) {
            log.info("[MarketplaceDataInitializer] Base de datos de marketplace ya cuenta con {} registros.", repository.count());
            return;
        }

        log.info("[MarketplaceDataInitializer] Inicializando catÃ¡logo oficial de Marketplace en base de datos...");

        List<MarketplaceItemEntity> seed = List.of(
                MarketplaceItemEntity.builder()
                        .id("m-cloth-1")
                        .itemType("PRODUCT")
                        .category("CLOTHING_THRIFT")
                        .serviceType("Ropa & Hoodies")
                        .condition("SEMINUEVO 9/10")
                        .price("S/ 45.00")
                        .numericPrice(45.0)
                        .originalPrice(85.0)
                        .unit("/ prenda")
                        .title("Hoodie Oversized Negro Unisex 100% AlgodÃ³n con Capucha (Talla M)")
                        .description("Polera con capucha de corte oversized holgado, tela franela reactiva que no destiÃ±e. SÃºper abrigadora para los salones y laboratorios de cÃ³mputo con aire acondicionado.")
                        .imageUrl("https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop")
                        .badge("THRIFT / RECOMENDADO")
                        .location("Torre A - Piso 3")
                        .rating(4.95)
                        .reviewsCount(24)
                        .salesCount(18)
                        .tutorName("Nicole Salazar")
                        .tutorCareer("Ing. Industrial")
                        .tutorCycle(4)
                        .reputation(97)
                        .contactMethod("WhatsApp: 982145781 â€¢ Entrega directa en campus Torre A")
                        .createdAt(LocalDateTime.now())
                        .build(),

                MarketplaceItemEntity.builder()
                        .id("m-acad-1")
                        .itemType("SERVICE")
                        .category("ACADEMIC_ADVICE")
                        .serviceType("AsesorÃ­a Universitaria")
                        .condition("EN VIVO / 1 A 1")
                        .price("S/ 25.00")
                        .numericPrice(25.0)
                        .originalPrice(40.0)
                        .unit("/ hora")
                        .title("AsesorÃ­a Intensiva en CÃ¡lculo Aplicado a la FÃ­sica y Ãlgebra Lineal")
                        .description("ResoluciÃ³n de ejercicios tipo examen, prÃ¡cticas calificadas pasadas y aclaraciÃ³n de dudas conceptuales paso a paso.")
                        .imageUrl("https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop")
                        .badge("TOP ASESOR UTP")
                        .location("Biblioteca Piso 4 / Virtual Meet")
                        .rating(4.98)
                        .reviewsCount(47)
                        .salesCount(35)
                        .tutorName("Franco Ramos")
                        .tutorCareer("Ing. de Sistemas")
                        .tutorCycle(7)
                        .reputation(99)
                        .contactMethod("WhatsApp: 974123890 â€¢ CoordinaciÃ³n de horario libre")
                        .createdAt(LocalDateTime.now().minusHours(2))
                        .build(),

                MarketplaceItemEntity.builder()
                        .id("m-tech-1")
                        .itemType("PRODUCT")
                        .category("TECH_HARDWARE")
                        .serviceType("Hardware & Accesorios")
                        .condition("COMO NUEVO 10/10")
                        .price("S/ 70.00")
                        .numericPrice(70.0)
                        .originalPrice(120.0)
                        .unit("/ unidad")
                        .title("Calculadora CientÃ­fica Casio fx-991LAX ClassWiz Original")
                        .description("Recomendada para exÃ¡menes de fÃ­sica, estadÃ­stica y mÃ©todos numÃ©ricos. Pantalla de alta resoluciÃ³n y 552 funciones integradas.")
                        .imageUrl("https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop")
                        .badge("HERRAMIENTA CLAVE")
                        .location("Torre B - Patio Central")
                        .rating(5.0)
                        .reviewsCount(12)
                        .salesCount(8)
                        .tutorName("Mateo Quispe")
                        .tutorCareer("Ing. Civil")
                        .tutorCycle(5)
                        .reputation(96)
                        .contactMethod("WhatsApp: 912345678 â€¢ Entrega inmediata en campus")
                        .createdAt(LocalDateTime.now().minusDays(1))
                        .build()
        );

        repository.saveAll(seed);
        log.info("[MarketplaceDataInitializer] âœ… CatÃ¡logo inicial de marketplace cargado en base de datos.");
    }
}

