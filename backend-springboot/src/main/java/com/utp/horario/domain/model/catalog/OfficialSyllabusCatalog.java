package com.utp.horario.domain.model.catalog;

import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.value_objets.SyllabusEvaluation;
import com.utp.horario.domain.model.value_objets.SyllabusWeeklySession;

import java.text.Normalizer;
import java.util.*;

/**
 * Catálogo canónico de sílabos oficiales UTP v1.2.0.
 * Provee especificaciones curriculares oficiales completas (fórmulas de evaluación ponderadas,
 * evaluaciones parciales/finales, competencias y cronograma semanal de 18 semanas).
 */
public final class OfficialSyllabusCatalog {

    private static final Map<String, Syllabus> CATALOG_BY_CODE = new LinkedHashMap<>();
    private static final Map<String, String> NAME_TO_CODE = new HashMap<>();

    static {
        register(buildDesarrolloWebIntegrado());
        register(buildInvestigacionSistemas());
        register(buildGestionServicioTi());
        register(buildComunicacionEfectiva());
        register(buildServiciosCloud());
        register(buildLenguajesProgramacion());
        register(buildDesarrolloSoftwareAvanzado());
        register(buildRedesComunicaciones());
    }

    private OfficialSyllabusCatalog() {}

    private static void register(Syllabus s) {
        CATALOG_BY_CODE.put(s.getCourseCode().toUpperCase(), s);
        NAME_TO_CODE.put(normalize(s.getCourseName()), s.getCourseCode().toUpperCase());
    }

    public static List<Syllabus> getAll() {
        return new ArrayList<>(CATALOG_BY_CODE.values());
    }

    public static Optional<Syllabus> find(String query) {
        if (query == null || query.isBlank()) return Optional.empty();

        String rawClean = query.trim().toUpperCase();
        if (CATALOG_BY_CODE.containsKey(rawClean)) {
            return Optional.of(CATALOG_BY_CODE.get(rawClean));
        }

        String normalizedQuery = normalize(query);
        if (NAME_TO_CODE.containsKey(normalizedQuery)) {
            return Optional.of(CATALOG_BY_CODE.get(NAME_TO_CODE.get(normalizedQuery)));
        }

        for (Map.Entry<String, String> entry : NAME_TO_CODE.entrySet()) {
            String normName = entry.getKey();
            if (normName.contains(normalizedQuery) || normalizedQuery.contains(normName)) {
                return Optional.of(CATALOG_BY_CODE.get(entry.getValue()));
            }
        }

        // Búsqueda por palabras clave clave
        if (normalizedQuery.contains("comunicacion") || normalizedQuery.contains("efectiva")) {
            return Optional.ofNullable(CATALOG_BY_CODE.get("100000SI67"));
        }
        if (normalizedQuery.contains("web") || normalizedQuery.contains("desarrollo web")) {
            return Optional.ofNullable(CATALOG_BY_CODE.get("100000SI65"));
        }
        if (normalizedQuery.contains("investigacion") || normalizedQuery.contains("sistemas")) {
            return Optional.ofNullable(CATALOG_BY_CODE.get("100000SI58"));
        }
        if (normalizedQuery.contains("servicio") || normalizedQuery.contains("ti") || normalizedQuery.contains("gestion")) {
            return Optional.ofNullable(CATALOG_BY_CODE.get("100000SI66"));
        }
        if (normalizedQuery.contains("cloud") || normalizedQuery.contains("servicios cloud")) {
            return Optional.ofNullable(CATALOG_BY_CODE.get("100000SI68"));
        }
        if (normalizedQuery.contains("lenguajes") || normalizedQuery.contains("programacion")) {
            return Optional.ofNullable(CATALOG_BY_CODE.get("100000SI69"));
        }

        return Optional.empty();
    }

    public static String normalize(String str) {
        if (str == null) return "";
        String normalized = Normalizer.normalize(str, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return normalized.replaceAll("-\\s*\\d{4,6}$", "").trim();
    }

    // 1. DESARROLLO WEB INTEGRADO
    private static Syllabus buildDesarrolloWebIntegrado() {
        return Syllabus.builder()
                .id("100000SI65")
                .courseCode("100000SI65")
                .courseName("Desarrollo Web Integrado")
                .semester("2026 - Ciclo 2 Agosto")
                .credits(3)
                .modality("Presencial")
                .weeklyHours(4)
                .careers(List.of("Ingeniería de Sistemas e Informática"))
                .learningGoal("Desarrollar soluciones web escalables y mantenibles aplicando arquitecturas modernas, patrones de diseño de software e integración frontend y backend.")
                .formula("20% [PC1] + 20% [PC2] + 20% [PA] + 40% [PROY]")
                .evaluations(List.of(
                        SyllabusEvaluation.builder().id("ev-dwi-1").type("PC1").description("Práctica Calificada 1: Arquitectura Frontend y Estado").week(5).weightPercent(20).modality("Individual").observation("Evaluación práctica de componentes y servicios").build(),
                        SyllabusEvaluation.builder().id("ev-dwi-2").type("PC2").description("Práctica Calificada 2: APIs RESTful y Seguridad").week(10).weightPercent(20).modality("Individual").observation("Implementación de endpoints y autenticación").build(),
                        SyllabusEvaluation.builder().id("ev-dwi-3").type("PA").description("Participación en Clase y Talleres").week(16).weightPercent(20).modality("Individual").observation("Ejercicios de laboratorio continuo").build(),
                        SyllabusEvaluation.builder().id("ev-dwi-4").type("PROY").description("Proyecto Final de Aplicación Web Fullstack").week(18).weightPercent(40).modality("Grupal").observation("Sustentación de plataforma desplegada en producción").build()
                ))
                .rules(List.of("Nota mínima aprobatoria: 12.", "Asistencia mínima obligatoria: 70%."))
                .maxSimilarityPercent(20)
                .aiPolicy("Se permite el uso de IA generativa con citación explícita y justificación arquitectónica.")
                .weeklySchedule(buildWeeks(
                        "Fundamentos de Arquitectura Web Moderna",
                        "Componentes, Enrutamiento y Ciclo de Vida",
                        "Gestión Reactiva del Estado (Signals / Redux)",
                        "Diseño de APIs RESTful y DTOs",
                        "Práctica Calificada 1 (PC1) - Frontend",
                        "Autenticación JWT y Filtros de Seguridad",
                        "Manejo de Errores y Validaciones de Esquema",
                        "Consumo Asíncrono de APIs y WebSockets",
                        "Modelado de Datos y Persistencia ORM",
                        "Práctica Calificada 2 (PC2) - Backend",
                        "Microservicios y Separación de Responsabilidades",
                        "Optimización de Rendimiento y Core Web Vitals",
                        "Contenedores Docker y Despliegue en la Nube",
                        "Pipelines CI/CD y Pruebas Automatizadas",
                        "Auditoría de Seguridad Web (OWASP Top 10)",
                        "Evaluación de Participación (PA) y Talleres",
                        "Integración Completa del Sistema",
                        "Sustentación del Proyecto Final Fullstack (PROY)"
                ))
                .build();
    }

    // 2. FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS
    private static Syllabus buildInvestigacionSistemas() {
        return Syllabus.builder()
                .id("100000SI58")
                .courseCode("100000SI58")
                .courseName("Formación para la Investigación - Sistemas")
                .semester("2026 - Ciclo 2 Agosto")
                .credits(3)
                .modality("Presencial")
                .weeklyHours(4)
                .careers(List.of("Ingeniería de Sistemas e Informática"))
                .learningGoal("Diseñar y formular proyectos de investigación aplicada en el área de ingeniería de sistemas conforme al método científico y estándares IEEE.")
                .formula("15% [PC1] + 20% [PC2] + 25% [PA] + 40% [PROY]")
                .evaluations(List.of(
                        SyllabusEvaluation.builder().id("ev-fis-1").type("PC1").description("Planteamiento y Justificación del Problema").week(4).weightPercent(15).modality("Individual").observation("Definición del alcance y objetivos").build(),
                        SyllabusEvaluation.builder().id("ev-fis-2").type("PC2").description("Matriz de Consistencia y Marco Teórico").week(9).weightPercent(20).modality("Individual").observation("Revisión de literatura en bases indexadas").build(),
                        SyllabusEvaluation.builder().id("ev-fis-3").type("PA").description("Avance de Metodología y Estado del Arte").week(15).weightPercent(25).modality("Individual").observation("Entregables metodológicos y fuentes primarias").build(),
                        SyllabusEvaluation.builder().id("ev-fis-4").type("PROY").description("Artículo Científico / Paper Final").week(18).weightPercent(40).modality("Grupal").observation("Documento completo bajo formato estándar IEEE").build()
                ))
                .rules(List.of("Nota mínima aprobatoria: 12.", "Revisión antiplagio estricta."))
                .maxSimilarityPercent(15)
                .aiPolicy("Prohibido el uso de IA para redactar conclusiones o falsear citas bibliográficas.")
                .weeklySchedule(buildWeeks(
                        "El Método Científico en Ingeniería",
                        "Búsqueda Bibliográfica en Scopus y IEEE Xplore",
                        "Planteamiento y Delimitación del Problema",
                        "Práctica Calificada 1 (PC1) - Justificación",
                        "Construcción del Marco Teórico y Antecedentes",
                        "Hipótesis, Variables y Operacionalización",
                        "Matriz de Consistencia Lógica",
                        "Metodologías Cuantitativas y Experimentales",
                        "Práctica Calificada 2 (PC2) - Marco Teórico",
                        "Diseño de Instrumentos de Recolección",
                        "Pruebas de Validez y Confiabilidad",
                        "Procesamiento y Análisis Estadístico",
                        "Discusión de Resultados y Comparativa",
                        "Redacción Científica bajo Norma IEEE",
                        "Evaluación de Avance Metodológico (PA)",
                        "Estructuración de Conclusiones y Futuros Trabajos",
                        "Revisión de Estilo y Similitud Académica",
                        "Sustentación de Artículo Científico Final (PROY)"
                ))
                .build();
    }

    // 3. GESTIÓN DEL SERVICIO TI
    private static Syllabus buildGestionServicioTi() {
        return Syllabus.builder()
                .id("100000SI66")
                .courseCode("100000SI66")
                .courseName("Gestión del Servicio TI")
                .semester("2026 - Ciclo 2 Agosto")
                .credits(3)
                .modality("Presencial")
                .weeklyHours(4)
                .careers(List.of("Ingeniería de Sistemas e Informática"))
                .learningGoal("Aplicar principios de ITIL 4 y marcos ágiles para gobernar, diseñar, entregar y mejorar servicios tecnológicos orientados al valor del negocio.")
                .formula("20% [PC1] + 20% [PC2] + 20% [TB] + 40% [EXFN]")
                .evaluations(List.of(
                        SyllabusEvaluation.builder().id("ev-gst-1").type("PC1").description("Práctica Calificada 1: Fundamentos ITIL 4").week(5).weightPercent(20).modality("Individual").observation("Sistema de Valor del Servicio y Dimensiones").build(),
                        SyllabusEvaluation.builder().id("ev-gst-2").type("PC2").description("Práctica Calificada 2: Gestión de Incidentes y Cambios").week(11).weightPercent(20).modality("Individual").observation("Prácticas de gestión del servicio").build(),
                        SyllabusEvaluation.builder().id("ev-gst-3").type("TB").description("Trabajo Grupal de Mesa de Ayuda y SLAs").week(15).weightPercent(20).modality("Grupal").observation("Simulación de Service Desk institucional").build(),
                        SyllabusEvaluation.builder().id("ev-gst-4").type("EXFN").description("Examen Final Integrador").week(18).weightPercent(40).modality("Individual").observation("Evaluación global de casos prácticos").build()
                ))
                .rules(List.of("Nota mínima aprobatoria: 12.", "Asistencia regular obligatoria."))
                .maxSimilarityPercent(20)
                .aiPolicy("Se fomenta la IA para análisis de casos y generación de plantillas de procesos.")
                .weeklySchedule(buildWeeks(
                        "Introducción a la Gestión de Servicios TI",
                        "Marco ITIL 4: Las Cuatro Dimensiones del Servicio",
                        "Sistema de Valor del Servicio (SVS)",
                        "Los 7 Principios Guía de ITIL",
                        "Práctica Calificada 1 (PC1) - SVS y Principios",
                        "Cadena de Valor del Servicio y Flujos de Trabajo",
                        "Práctica de Service Desk y Gestión de Peticiones",
                        "Gestión de Incidentes y Planes de Contingencia",
                        "Gestión de Problemas y Análisis Causa Raíz",
                        "Gestión de Habilitación del Cambio (Change Enablement)",
                        "Práctica Calificada 2 (PC2) - Prácticas TI",
                        "Gestión de Niveles de Servicio (SLA, OLA y UCs)",
                        "Gestión de Activos y Configuración TI (CMDB)",
                        "Gestión de la Continuidad y Disponibilidad",
                        "Trabajo de Aplicación Práctica: Service Desk (TB)",
                        "Modelo de Mejora Continua en Servicios TI",
                        "Métricas, KPIs y Cuadros de Mando para TI",
                        "Examen Final Integrador (EXFN)"
                ))
                .build();
    }

    // 4. HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA (24/7 Virtual)
    private static Syllabus buildComunicacionEfectiva() {
        return Syllabus.builder()
                .id("100000SI67")
                .courseCode("100000SI67")
                .courseName("Herramientas para la Comunicación Efectiva")
                .semester("2026 - Ciclo 2 Agosto")
                .credits(2)
                .modality("Virtual 24/7 (Asíncrono)")
                .weeklyHours(3)
                .careers(List.of("Ingeniería de Sistemas e Informática"))
                .learningGoal("Desarrollar competencias comunicativas verbales, no verbales y digitales para transmitir mensajes técnicos con claridad e impacto profesional.")
                .formula("20% [TA1] + 20% [TA2] + 20% [TA3] + 40% [TF]")
                .evaluations(List.of(
                        SyllabusEvaluation.builder().id("ev-hce-1").type("TA1").description("Tarea Académica 1: Comunicación Asertiva Digital").week(4).weightPercent(20).modality("Individual").observation("Entrega asíncrona en Canvas").build(),
                        SyllabusEvaluation.builder().id("ev-hce-2").type("TA2").description("Tarea Académica 2: Oratoria y Lenguaje No Verbal").week(8).weightPercent(20).modality("Individual").observation("Grabación de video discurso persuasivo").build(),
                        SyllabusEvaluation.builder().id("ev-hce-3").type("TA3").description("Tarea Académica 3: Redacción de Informes Ejecutivos").week(13).weightPercent(20).modality("Individual").observation("Síntesis técnica para toma de decisiones").build(),
                        SyllabusEvaluation.builder().id("ev-hce-4").type("TF").description("Trabajo Final: Presentación de Pitch Profesional").week(17).weightPercent(40).modality("Individual").observation("Propuesta innovadora sustentada en video").build()
                ))
                .rules(List.of("Curso 100% asíncrono en Canvas.", "Cumplimiento estricto de fechas límite semanales."))
                .maxSimilarityPercent(15)
                .aiPolicy("Permitido para corregir estilo gramatical manteniendo autoría personal.")
                .weeklySchedule(buildWeeks(
                        "Bases de la Comunicación Asertiva y Barreras",
                        "Escucha Activa y Empatía en Equipos de Trabajo",
                        "Comunicación Escrita en Medios Digitales",
                        "Tarea Académica 1 (TA1) - Comunicación Asertiva",
                        "Estructura del Mensaje Persuasivo y Storytelling",
                        "Argumentación Lógica y Falacias Frecuentes",
                        "El Lenguaje No Verbal y la Proyección de Confianza",
                        "Tarea Académica 2 (TA2) - Discurso Persuasivo",
                        "Manejo de la Voz: Modulación, Ritmo y Énfasis",
                        "Presentaciones de Alto Impacto con Recursos Visuales",
                        "Redacción de Correos, Minutas e Informes Técnicos",
                        "Síntesis Ejecutiva para Líderes y Clientes",
                        "Tarea Académica 3 (TA3) - Informe Ejecutivo",
                        "Gestión de Conflictos y Negociación Constructiva",
                        "Feedback Efectivo y Retroalimentación 360",
                        "Preparación y Ensayos de Pitch Profesional",
                        "Trabajo Final (TF) - Pitch Profesional Grabado",
                        "Cierre de Curso y Evaluación de Competencias"
                ))
                .build();
    }

    // 5. SERVICIOS CLOUD
    private static Syllabus buildServiciosCloud() {
        return Syllabus.builder()
                .id("100000SI68")
                .courseCode("100000SI68")
                .courseName("Servicios Cloud")
                .semester("2026 - Ciclo 2 Agosto")
                .credits(3)
                .modality("Presencial")
                .weeklyHours(4)
                .careers(List.of("Ingeniería de Sistemas e Informática"))
                .learningGoal("Diseñar, configurar y administrar infraestructuras en plataformas en la nube utilizando contenedores, serverless e infraestructura como código.")
                .formula("25% [PC1] + 25% [PC2] + 20% [LAB] + 30% [PROY]")
                .evaluations(List.of(
                        SyllabusEvaluation.builder().id("ev-sc-1").type("PC1").description("Práctica Calificada 1: Modelos Cloud e Infraestructura Base").week(5).weightPercent(25).modality("Individual").observation("VPC, Subnets e Instancias de Cómputo").build(),
                        SyllabusEvaluation.builder().id("ev-sc-2").type("PC2").description("Práctica Calificada 2: Contenedores y Serverless").week(11).weightPercent(25).modality("Individual").observation("Docker, Lambdas y Storage").build(),
                        SyllabusEvaluation.builder().id("ev-sc-3").type("LAB").description("Laboratorios Prácticos en Nube").week(15).weightPercent(20).modality("Individual").observation("Guías y talleres resueltos en consola").build(),
                        SyllabusEvaluation.builder().id("ev-sc-4").type("PROY").description("Proyecto Cloud Resiliente y Escalable").week(18).weightPercent(30).modality("Grupal").observation("Infraestructura como Código (IaC) desplegada").build()
                ))
                .rules(List.of("Nota mínima aprobatoria: 12.", "Uso eficiente de cuotas de nube."))
                .maxSimilarityPercent(20)
                .aiPolicy("Se estimula el uso de herramientas IA para scripting y síntesis de plantillas IaC.")
                .weeklySchedule(buildWeeks(
                        "Fundamentos de Cloud Computing y Tipos de Servicios",
                        "Redes en la Nube: VPC, Subredes y Tablas de Ruteo",
                        "Cómputo Elástico: Instancias y Escalado Horizontal",
                        "Almacenamiento de Objetos y Bloques (S3, EBS)",
                        "Práctica Calificada 1 (PC1) - Redes y Cómputo",
                        "Gestión de Identidades, Roles y Seguridad (IAM)",
                        "Bases de Datos Gestionadas Relacionales y NoSQL",
                        "Contenedores en la Nube: Registro de Imágenes y ECS",
                        "Arquitectura Serverless: Funciones como Servicio (FaaS)",
                        "Mensajería y Eventos Distribuidos (SQS, SNS)",
                        "Práctica Calificada 2 (PC2) - Contenedores y Serverless",
                        "Infraestructura como Código (IaC) con Terraform",
                        "Monitoreo, Métricas y Alarmas (CloudWatch)",
                        "Costos, Optimización y Well-Architected Framework",
                        "Evaluación de Laboratorios Prácticos (LAB)",
                        "Arquitecturas Multi-Región y Tolerancia a Fallos",
                        "Seguridad Perimetral, WAF y Prevención DDoS",
                        "Sustentación de Proyecto de Infraestructura Cloud (PROY)"
                ))
                .build();
    }

    // 6. LENGUAJES DE PROGRAMACIÓN
    private static Syllabus buildLenguajesProgramacion() {
        return Syllabus.builder()
                .id("100000SI69")
                .courseCode("100000SI69")
                .courseName("Lenguajes de Programación")
                .semester("2026 - Ciclo 2 Agosto")
                .credits(3)
                .modality("Presencial")
                .weeklyHours(4)
                .careers(List.of("Ingeniería de Sistemas e Informática"))
                .learningGoal("Analizar los paradigmas de programación, sistemas de tipos, compilación y modelos de ejecución de lenguajes modernos para seleccionar la tecnología adecuada.")
                .formula("20% [PC1] + 20% [PC2] + 20% [LAB] + 40% [EXFN]")
                .evaluations(List.of(
                        SyllabusEvaluation.builder().id("ev-lp-1").type("PC1").description("Práctica Calificada 1: Paradigmas y Gramáticas").week(5).weightPercent(20).modality("Individual").observation("Análisis léxico, sintáctico y AST").build(),
                        SyllabusEvaluation.builder().id("ev-lp-2").type("PC2").description("Práctica Calificada 2: Concurrencia y Memoria").week(11).weightPercent(20).modality("Individual").observation("Modelos de ejecución y gestión de memoria").build(),
                        SyllabusEvaluation.builder().id("ev-lp-3").type("LAB").description("Laboratorios de Implementación").week(15).weightPercent(20).modality("Individual").observation("Ejercicios prácticos en múltiples lenguajes").build(),
                        SyllabusEvaluation.builder().id("ev-lp-4").type("EXFN").description("Examen Final Teórico-Práctico").week(18).weightPercent(40).modality("Individual").observation("Evaluación integradora de diseño de lenguajes").build()
                ))
                .rules(List.of("Nota mínima aprobatoria: 12.", "Entrega de código limpio y documentado."))
                .maxSimilarityPercent(20)
                .aiPolicy("Permitido para análisis comparativo de sintaxis y soporte de depuración.")
                .weeklySchedule(buildWeeks(
                        "Evolución y Clasificación de Lenguajes de Programación",
                        "Gramáticas Libres de Contexto y Jerarquía de Chomsky",
                        "Análisis Léxico, Sintáctico y Árboles AST",
                        "Paradigmas Imperativo y Declarativo",
                        "Práctica Calificada 1 (PC1) - Gramáticas y Sintaxis",
                        "Sistemas de Tipos: Estático, Dinámico, Fuerte y Débil",
                        "Inferencia de Tipos y Polimorfismo Paramétrico",
                        "Paradigma Funcional: Inmutabilidad, Lambdas y Currying",
                        "Gestión de Memoria: Stack, Heap y Recolección de Basura",
                        "Modelo de Propiedad y Borrow Checker (Rust)",
                        "Práctica Calificada 2 (PC2) - Memoria y Tipos",
                        "Modelos de Concurrencia: Hilos, Corrutinas y Event Loop",
                        "Manejo de Errores: Excepciones vs Resultados Monádicos",
                        "Metaprogramación, Reflexión y Macros",
                        "Evaluación de Laboratorios de Programación (LAB)",
                        "Diseño e Implementación de un Intérprete Básico",
                        "Tendencias Modernas: WebAssembly y DSLs",
                        "Examen Final Integrador (EXFN)"
                ))
                .build();
    }

    // 7. DESARROLLO DE SOFTWARE AVANZADO
    private static Syllabus buildDesarrolloSoftwareAvanzado() {
        return Syllabus.builder()
                .id("100000SI60")
                .courseCode("100000SI60")
                .courseName("Desarrollo de Software Avanzado")
                .semester("2026 - Ciclo 2 Agosto")
                .credits(4)
                .modality("Presencial")
                .weeklyHours(4)
                .careers(List.of("Ingeniería de Sistemas e Informática"))
                .learningGoal("Construir arquitecturas de software robustas basadas en Domain-Driven Design (DDD), CQRS y microservicios orientados a eventos.")
                .formula("20% [PC1] + 20% [PC2] + 20% [TB] + 40% [EXFN]")
                .evaluations(List.of(
                        SyllabusEvaluation.builder().id("ev-dsa-1").type("PC1").description("Práctica Calificada 1: Modelado Estratégico DDD").week(5).weightPercent(20).modality("Individual").observation("Bounded Contexts y Context Maps").build(),
                        SyllabusEvaluation.builder().id("ev-dsa-2").type("PC2").description("Práctica Calificada 2: Patrones Tácticos y CQRS").week(11).weightPercent(20).modality("Individual").observation("Agregados, Entidades y Commands").build(),
                        SyllabusEvaluation.builder().id("ev-dsa-3").type("TB").description("Trabajo Grupal de Microservicios").week(15).weightPercent(20).modality("Grupal").observation("Implementación en Spring Boot y MySQL").build(),
                        SyllabusEvaluation.builder().id("ev-dsa-4").type("EXFN").description("Examen Final Integrador").week(18).weightPercent(40).modality("Individual").observation("Defensa de arquitectura distribuida").build()
                ))
                .rules(List.of("Nota mínima aprobatoria: 12."))
                .maxSimilarityPercent(20)
                .aiPolicy("Uso ético y declarado de IA en arquitectura de software.")
                .weeklySchedule(buildWeeks(
                        "Introducción a DDD y Complejidad del Software",
                        "Diseño Estratégico: Bounded Contexts y Ubiquitous Language",
                        "Context Maps y Relaciones entre Equipos",
                        "Arquitectura Limpia y Arquitectura Hexagonal vs DDD",
                        "Práctica Calificada 1 (PC1) - Diseño Estratégico",
                        "Patrones Tácticos: Entidades, Value Objects e Identidad",
                        "Agregados y Reglas de Invarianza de Dominio",
                        "Repositorios, Servicios de Dominio y Fábricas",
                        "Patrón CQRS: Separación de Lectura y Escritura",
                        "Event-Driven Architecture y Domain Events",
                        "Práctica Calificada 2 (PC2) - Patrones Tácticos",
                        "Microservicios con Spring Boot y JPA",
                        "Transacciones Distribuidas y Patrón Saga",
                        "Resiliencia: Circuit Breaker, Retries y Bulkhead",
                        "Entrega de Trabajo Grupal de Microservicios (TB)",
                        "Monitoreo Distribuido con Tracing y Métricas",
                        "Seguridad en Microservicios y OAuth2",
                        "Examen Final Integrador (EXFN)"
                ))
                .build();
    }

    // 8. REDES Y COMUNICACIONES
    private static Syllabus buildRedesComunicaciones() {
        return Syllabus.builder()
                .id("100000SI62")
                .courseCode("100000SI62")
                .courseName("Redes y Comunicaciones")
                .semester("2026 - Ciclo 2 Agosto")
                .credits(3)
                .modality("Presencial")
                .weeklyHours(4)
                .careers(List.of("Ingeniería de Sistemas e Informática"))
                .learningGoal("Analizar, diseñar y configurar infraestructuras de red basadas en los modelos OSI y TCP/IP, enrutamiento, conmutación y seguridad.")
                .formula("30% [LAB] + 30% [PC] + 40% [EXFN]")
                .evaluations(List.of(
                        SyllabusEvaluation.builder().id("ev-ryc-1").type("PC").description("Práctica Calificada: Enrutamiento y Direccionamiento").week(7).weightPercent(30).modality("Individual").observation("Subnetting VLSM y protocolos de enrutamiento").build(),
                        SyllabusEvaluation.builder().id("ev-ryc-2").type("LAB").description("Talleres de Simulación en Packet Tracer").week(14).weightPercent(30).modality("Individual").observation("Configuración de VLANs y Trunks").build(),
                        SyllabusEvaluation.builder().id("ev-ryc-3").type("EXFN").description("Examen Final Integrador").week(18).weightPercent(40).modality("Individual").observation("Evaluación práctica de redes corporativas").build()
                ))
                .rules(List.of("Nota mínima aprobatoria: 12."))
                .maxSimilarityPercent(20)
                .aiPolicy("Permitido para análisis de configuraciones de red y diagnóstico.")
                .weeklySchedule(buildWeeks(
                        "Modelos de Comunicación: OSI vs TCP/IP",
                        "Capa Física y Medios de Transmisión",
                        "Capa de Enlace: Direccionamiento MAC y Tramas Ethernet",
                        "Protocolos ARP y Conmutación en Capa 2",
                        "Capa de Red: Direccionamiento IPv4 y Subnetting FLSM",
                        "Diseño de Redes Eficientes con Subnetting VLSM",
                        "Práctica Calificada (PC) - Direccionamiento IPv4",
                        "Introducción a IPv6 y Tipos de Direcciones",
                        "Configuración de VLANs y Segmentación de Red",
                        "Enlaces Troncales 802.1Q y VTP",
                        "Enrutamiento Inter-VLAN (Router on a Stick)",
                        "Enrutamiento Estático y Rutas por Defecto",
                        "Protocolos de Enrutamiento Dinámico: OSPF",
                        "Laboratorio de Simulación y Packet Tracer (LAB)",
                        "Capa de Transporte: Comparativa TCP vs UDP",
                        "Listas de Control de Acceso (ACLs) y Seguridad",
                        "Protocolos de Aplicación: DNS, DHCP, HTTP y SSH",
                        "Examen Final Integrador (EXFN)"
                ))
                .build();
    }

    private static List<SyllabusWeeklySession> buildWeeks(String... topics) {
        List<SyllabusWeeklySession> weeks = new ArrayList<>();
        for (int i = 0; i < topics.length; i++) {
            int weekNum = i + 1;
            String unit = weekNum <= 4 ? "Unidad 1: Fundamentos y Conceptos Clave" :
                    weekNum <= 9 ? "Unidad 2: Metodología y Desarrollo Central" :
                            weekNum <= 14 ? "Unidad 3: Implementación y Práctica Avanzada" :
                                    "Unidad 4: Consolidación, Evaluación y Entrega Final";

            weeks.add(SyllabusWeeklySession.builder()
                    .week(weekNum)
                    .session(1)
                    .unit(unit)
                    .topic(topics[i])
                    .activities("Sesión teórica guiada, análisis de casos y ejercicios prácticos")
                    .evaluation(weekNum == 18 ? "Evaluación Final" : null)
                    .build());
        }
        return weeks;
    }
}
