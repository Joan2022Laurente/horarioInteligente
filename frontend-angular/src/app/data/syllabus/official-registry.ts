import { CourseEvaluation } from '@domain/models/utp.model';
import { ParsedSyllabus, SyllabusWeeklySession } from './types';
import { getAllCachedSyllabi } from './client-storage';

function build18Weeks(topics: string[]): SyllabusWeeklySession[] {
  return topics.map((topic, i) => {
    const week = i + 1;
    const unit = week <= 4 ? 'Unidad 1: Fundamentos y Conceptos Clave' :
                 week <= 9 ? 'Unidad 2: Metodología y Desarrollo Central' :
                 week <= 14 ? 'Unidad 3: Implementación y Práctica Avanzada' :
                              'Unidad 4: Consolidación, Evaluación y Entrega Final';
    return {
      week,
      session: 1,
      unit,
      topic,
      topics: [topic],
      activities: 'Sesión teórica guiada, análisis de casos y ejercicios prácticos',
      evaluation: week === 18 ? 'Evaluación Final' : undefined,
    };
  });
}

const SYLLABUS_DESARROLLO_WEB: ParsedSyllabus = {
  id: '100000SI65',
  generalInfo: {
    courseCode: '100000SI65',
    courseName: 'Desarrollo Web Integrado',
    semester: '2026 - Ciclo 2 Agosto',
    credits: 3,
    modality: 'Presencial',
    weeklyHours: 4,
    careers: ['Ingeniería de Sistemas e Informática'],
  },
  learningGoal: 'Desarrollar soluciones web escalables y mantenibles aplicando arquitecturas modernas, patrones de diseño de software e integración frontend y backend.',
  formula: '20% [PC1] + 20% [PC2] + 20% [PA] + 40% [PROY]',
  evaluations: [
    { id: 'ev-dwi-1', type: 'PC1', description: 'Práctica Calificada 1: Arquitectura Frontend y Estado', week: 5, weightPercent: 20, modality: 'Individual', observation: 'Evaluación práctica de componentes y servicios' },
    { id: 'ev-dwi-2', type: 'PC2', description: 'Práctica Calificada 2: APIs RESTful y Seguridad', week: 10, weightPercent: 20, modality: 'Individual', observation: 'Implementación de endpoints y autenticación' },
    { id: 'ev-dwi-3', type: 'PA', description: 'Participación en Clase y Talleres', week: 16, weightPercent: 20, modality: 'Individual', observation: 'Ejercicios de laboratorio continuo' },
    { id: 'ev-dwi-4', type: 'PROY', description: 'Proyecto Final de Aplicación Web Fullstack', week: 18, weightPercent: 40, modality: 'Grupal', observation: 'Sustentación de plataforma desplegada en producción' },
  ],
  rules: ['Nota mínima aprobatoria: 12.', 'Asistencia mínima obligatoria: 70%.'],
  antiPlagiarismPolicy: {
    maxSimilarityPercent: 20,
    aiPolicy: 'Se permite el uso de IA generativa con citación explícita y justificación arquitectónica.',
    repositoryDelivery: 'Repositorio oficial Git con historial de commits verificable.'
  },
  weeklySchedule: build18Weeks([
    'Fundamentos de Arquitectura Web Moderna',
    'Componentes, Enrutamiento y Ciclo de Vida',
    'Gestión Reactiva del Estado (Signals / Redux)',
    'Diseño de APIs RESTful y DTOs',
    'Práctica Calificada 1 (PC1) - Frontend',
    'Autenticación JWT y Filtros de Seguridad',
    'Manejo de Errores y Validaciones de Esquema',
    'Consumo Asíncrono de APIs y WebSockets',
    'Modelado de Datos y Persistencia ORM',
    'Práctica Calificada 2 (PC2) - Backend',
    'Microservicios y Separación de Responsabilidades',
    'Optimización de Rendimiento y Core Web Vitals',
    'Contenedores Docker y Despliegue en la Nube',
    'Pipelines CI/CD y Pruebas Automatizadas',
    'Auditoría de Seguridad Web (OWASP Top 10)',
    'Evaluación de Participación (PA) y Talleres',
    'Integración Completa del Sistema',
    'Sustentación del Proyecto Final Fullstack (PROY)'
  ])
};

const SYLLABUS_INVESTIGACION: ParsedSyllabus = {
  id: '100000SI58',
  generalInfo: {
    courseCode: '100000SI58',
    courseName: 'Formación para la Investigación - Sistemas',
    semester: '2026 - Ciclo 2 Agosto',
    credits: 3,
    modality: 'Presencial',
    weeklyHours: 4,
    careers: ['Ingeniería de Sistemas e Informática'],
  },
  learningGoal: 'Diseñar y formular proyectos de investigación aplicada en el área de ingeniería de sistemas conforme al método científico y estándares IEEE.',
  formula: '15% [PC1] + 20% [PC2] + 25% [PA] + 40% [PROY]',
  evaluations: [
    { id: 'ev-fis-1', type: 'PC1', description: 'Planteamiento y Justificación del Problema', week: 4, weightPercent: 15, modality: 'Individual', observation: 'Definición del alcance y objetivos' },
    { id: 'ev-fis-2', type: 'PC2', description: 'Matriz de Consistencia y Marco Teórico', week: 9, weightPercent: 20, modality: 'Individual', observation: 'Revisión de literatura en bases indexadas' },
    { id: 'ev-fis-3', type: 'PA', description: 'Avance de Metodología y Estado del Arte', week: 15, weightPercent: 25, modality: 'Individual', observation: 'Entregables metodológicos y fuentes primarias' },
    { id: 'ev-fis-4', type: 'PROY', description: 'Artículo Científico / Paper Final', week: 18, weightPercent: 40, modality: 'Grupal', observation: 'Documento completo bajo formato estándar IEEE' },
  ],
  rules: ['Nota mínima aprobatoria: 12.', 'Revisión antiplagio estricta.'],
  antiPlagiarismPolicy: {
    maxSimilarityPercent: 15,
    aiPolicy: 'Prohibido el uso de IA para redactar conclusiones o falsear citas bibliográficas.',
    repositoryDelivery: 'Entrega por Turnitin oficial de la universidad.'
  },
  weeklySchedule: build18Weeks([
    'El Método Científico en Ingeniería',
    'Búsqueda Bibliográfica en Scopus y IEEE Xplore',
    'Planteamiento y Delimitación del Problema',
    'Práctica Calificada 1 (PC1) - Justificación',
    'Construcción del Marco Teórico y Antecedentes',
    'Hipótesis, Variables y Operacionalización',
    'Matriz de Consistencia Lógica',
    'Metodologías Cuantitativas y Experimentales',
    'Práctica Calificada 2 (PC2) - Marco Teórico',
    'Diseño de Instrumentos de Recolección',
    'Pruebas de Validez y Confiabilidad',
    'Procesamiento y Análisis Estadístico',
    'Discusión de Resultados y Comparativa',
    'Redacción Científica bajo Norma IEEE',
    'Evaluación de Avance Metodológico (PA)',
    'Estructuración de Conclusiones y Futuros Trabajos',
    'Revisión de Estilo y Similitud Académica',
    'Sustentación de Artículo Científico Final (PROY)'
  ])
};

const SYLLABUS_GESTION_TI: ParsedSyllabus = {
  id: '100000SI66',
  generalInfo: {
    courseCode: '100000SI66',
    courseName: 'Gestión del Servicio TI',
    semester: '2026 - Ciclo 2 Agosto',
    credits: 3,
    modality: 'Presencial',
    weeklyHours: 4,
    careers: ['Ingeniería de Sistemas e Informática'],
  },
  learningGoal: 'Aplicar principios de ITIL 4 y marcos ágiles para gobernar, diseñar, entregar y mejorar servicios tecnológicos orientados al valor del negocio.',
  formula: '20% [PC1] + 20% [PC2] + 20% [TB] + 40% [EXFN]',
  evaluations: [
    { id: 'ev-gst-1', type: 'PC1', description: 'Práctica Calificada 1: Fundamentos ITIL 4', week: 5, weightPercent: 20, modality: 'Individual', observation: 'Sistema de Valor del Servicio y Dimensiones' },
    { id: 'ev-gst-2', type: 'PC2', description: 'Práctica Calificada 2: Gestión de Incidentes y Cambios', week: 11, weightPercent: 20, modality: 'Individual', observation: 'Prácticas de gestión del servicio' },
    { id: 'ev-gst-3', type: 'TB', description: 'Trabajo Grupal de Mesa de Ayuda y SLAs', week: 15, weightPercent: 20, modality: 'Grupal', observation: 'Simulación de Service Desk institucional' },
    { id: 'ev-gst-4', type: 'EXFN', description: 'Examen Final Integrador', week: 18, weightPercent: 40, modality: 'Individual', observation: 'Evaluación global de casos prácticos' },
  ],
  rules: ['Nota mínima aprobatoria: 12.', 'Asistencia regular obligatoria.'],
  antiPlagiarismPolicy: {
    maxSimilarityPercent: 20,
    aiPolicy: 'Se fomenta la IA para análisis de casos y generación de plantillas de procesos.',
    repositoryDelivery: 'Entrega en plataforma Canvas.'
  },
  weeklySchedule: build18Weeks([
    'Introducción a la Gestión de Servicios TI',
    'Marco ITIL 4: Las Cuatro Dimensiones del Servicio',
    'Sistema de Valor del Servicio (SVS)',
    'Los 7 Principios Guía de ITIL',
    'Práctica Calificada 1 (PC1) - SVS y Principios',
    'Cadena de Valor del Servicio y Flujos de Trabajo',
    'Práctica de Service Desk y Gestión de Peticiones',
    'Gestión de Incidentes y Planes de Contingencia',
    'Gestión de Problemas y Análisis Causa Raíz',
    'Gestión de Habilitación del Cambio (Change Enablement)',
    'Práctica Calificada 2 (PC2) - Prácticas TI',
    'Gestión de Niveles de Servicio (SLA, OLA y UCs)',
    'Gestión de Activos y Configuración TI (CMDB)',
    'Gestión de la Continuidad y Disponibilidad',
    'Trabajo de Aplicación Práctica: Service Desk (TB)',
    'Modelo de Mejora Continua en Servicios TI',
    'Métricas, KPIs y Cuadros de Mando para TI',
    'Examen Final Integrador (EXFN)'
  ])
};

const SYLLABUS_COMUNICACION: ParsedSyllabus = {
  id: '100000SI67',
  generalInfo: {
    courseCode: '100000SI67',
    courseName: 'Herramientas para la Comunicación Efectiva',
    semester: '2026 - Ciclo 2 Agosto',
    credits: 2,
    modality: 'Virtual 24/7 (Asíncrono)',
    weeklyHours: 3,
    careers: ['Ingeniería de Sistemas e Informática'],
  },
  learningGoal: 'Desarrollar competencias comunicativas verbales, no verbales y digitales para transmitir mensajes técnicos con claridad e impacto profesional.',
  formula: '20% [TA1] + 20% [TA2] + 20% [TA3] + 40% [TF]',
  evaluations: [
    { id: 'ev-hce-1', type: 'TA1', description: 'Tarea Académica 1: Comunicación Asertiva Digital', week: 4, weightPercent: 20, modality: 'Individual', observation: 'Entrega asíncrona en Canvas' },
    { id: 'ev-hce-2', type: 'TA2', description: 'Tarea Académica 2: Oratoria y Lenguaje No Verbal', week: 8, weightPercent: 20, modality: 'Individual', observation: 'Grabación de video discurso persuasivo' },
    { id: 'ev-hce-3', type: 'TA3', description: 'Tarea Académica 3: Redacción de Informes Ejecutivos', week: 13, weightPercent: 20, modality: 'Individual', observation: 'Síntesis técnica para toma de decisiones' },
    { id: 'ev-hce-4', type: 'TF', description: 'Trabajo Final: Presentación de Pitch Profesional', week: 17, weightPercent: 40, modality: 'Individual', observation: 'Propuesta innovadora sustentada en video' },
  ],
  rules: ['Curso 100% asíncrono en Canvas.', 'Cumplimiento estricto de fechas límite semanales.'],
  antiPlagiarismPolicy: {
    maxSimilarityPercent: 15,
    aiPolicy: 'Permitido para corregir estilo gramatical manteniendo autoría personal.',
    repositoryDelivery: 'Entrega digital en Canvas.'
  },
  weeklySchedule: build18Weeks([
    'Bases de la Comunicación Asertiva y Barreras',
    'Escucha Activa y Empatía en Equipos de Trabajo',
    'Comunicación Escrita en Medios Digitales',
    'Tarea Académica 1 (TA1) - Comunicación Asertiva',
    'Estructura del Mensaje Persuasivo y Storytelling',
    'Argumentación Lógica y Falacias Frecuentes',
    'El Lenguaje No Verbal y la Proyección de Confianza',
    'Tarea Académica 2 (TA2) - Discurso Persuasivo',
    'Manejo de la Voz: Modulación, Ritmo y Énfasis',
    'Presentaciones de Alto Impacto con Recursos Visuales',
    'Redacción de Correos, Minutas e Informes Técnicos',
    'Síntesis Ejecutiva para Líderes y Clientes',
    'Tarea Académica 3 (TA3) - Informe Ejecutivo',
    'Gestión de Conflictos y Negociación Constructiva',
    'Feedback Efectivo y Retroalimentación 360',
    'Preparación y Ensayos de Pitch Profesional',
    'Trabajo Final (TF) - Pitch Profesional Grabado',
    'Cierre de Curso y Evaluación de Competencias'
  ])
};

const SYLLABUS_CLOUD: ParsedSyllabus = {
  id: '100000SI68',
  generalInfo: {
    courseCode: '100000SI68',
    courseName: 'Servicios Cloud',
    semester: '2026 - Ciclo 2 Agosto',
    credits: 3,
    modality: 'Presencial',
    weeklyHours: 4,
    careers: ['Ingeniería de Sistemas e Informática'],
  },
  learningGoal: 'Diseñar, configurar y administrar infraestructuras en plataformas en la nube utilizando contenedores, serverless e infraestructura como código.',
  formula: '25% [PC1] + 25% [PC2] + 20% [LAB] + 30% [PROY]',
  evaluations: [
    { id: 'ev-sc-1', type: 'PC1', description: 'Práctica Calificada 1: Modelos Cloud e Infraestructura Base', week: 5, weightPercent: 25, modality: 'Individual', observation: 'VPC, Subnets e Instancias de Cómputo' },
    { id: 'ev-sc-2', type: 'PC2', description: 'Práctica Calificada 2: Contenedores y Serverless', week: 11, weightPercent: 25, modality: 'Individual', observation: 'Docker, Lambdas y Storage' },
    { id: 'ev-sc-3', type: 'LAB', description: 'Laboratorios Prácticos en Nube', week: 15, weightPercent: 20, modality: 'Individual', observation: 'Guías y talleres resueltos en consola' },
    { id: 'ev-sc-4', type: 'PROY', description: 'Proyecto Cloud Resiliente y Escalable', week: 18, weightPercent: 30, modality: 'Grupal', observation: 'Infraestructura como Código (IaC) desplegada' },
  ],
  rules: ['Nota mínima aprobatoria: 12.', 'Uso eficiente de cuotas de nube.'],
  antiPlagiarismPolicy: {
    maxSimilarityPercent: 20,
    aiPolicy: 'Se estimula el uso de herramientas IA para scripting y síntesis de plantillas IaC.',
    repositoryDelivery: 'Repositorio con scripts Terraform y Dockerfiles.'
  },
  weeklySchedule: build18Weeks([
    'Fundamentos de Cloud Computing y Tipos de Servicios',
    'Redes en la Nube: VPC, Subredes y Tablas de Ruteo',
    'Cómputo Elástico: Instancias y Escalado Horizontal',
    'Almacenamiento de Objetos y Bloques (S3, EBS)',
    'Práctica Calificada 1 (PC1) - Redes y Cómputo',
    'Gestión de Identidades, Roles y Seguridad (IAM)',
    'Bases de Datos Gestionadas Relacionales y NoSQL',
    'Contenedores en la Nube: Registro de Imágenes y ECS',
    'Arquitectura Serverless: Funciones como Servicio (FaaS)',
    'Mensajería y Eventos Distribuidos (SQS, SNS)',
    'Práctica Calificada 2 (PC2) - Contenedores y Serverless',
    'Infraestructura como Código (IaC) con Terraform',
    'Monitoreo, Métricas y Alarmas (CloudWatch)',
    'Costos, Optimización y Well-Architected Framework',
    'Evaluación de Laboratorios Prácticos (LAB)',
    'Arquitecturas Multi-Región y Tolerancia a Fallos',
    'Seguridad Perimetral, WAF y Prevención DDoS',
    'Sustentación de Proyecto de Infraestructura Cloud (PROY)'
  ])
};

const SYLLABUS_LENGUAJES: ParsedSyllabus = {
  id: '100000SI69',
  generalInfo: {
    courseCode: '100000SI69',
    courseName: 'Lenguajes de Programación',
    semester: '2026 - Ciclo 2 Agosto',
    credits: 3,
    modality: 'Presencial',
    weeklyHours: 4,
    careers: ['Ingeniería de Sistemas e Informática'],
  },
  learningGoal: 'Analizar los paradigmas de programación, sistemas de tipos, compilación y modelos de ejecución de lenguajes modernos para seleccionar la tecnología adecuada.',
  formula: '20% [PC1] + 20% [PC2] + 20% [LAB] + 40% [EXFN]',
  evaluations: [
    { id: 'ev-lp-1', type: 'PC1', description: 'Práctica Calificada 1: Paradigmas y Gramáticas', week: 5, weightPercent: 20, modality: 'Individual', observation: 'Análisis léxico, sintáctico y AST' },
    { id: 'ev-lp-2', type: 'PC2', description: 'Práctica Calificada 2: Concurrencia y Memoria', week: 11, weightPercent: 20, modality: 'Individual', observation: 'Modelos de ejecución y gestión de memoria' },
    { id: 'ev-lp-3', type: 'LAB', description: 'Laboratorios de Implementación', week: 15, weightPercent: 20, modality: 'Individual', observation: 'Ejercicios prácticos en múltiples lenguajes' },
    { id: 'ev-lp-4', type: 'EXFN', description: 'Examen Final Teórico-Práctico', week: 18, weightPercent: 40, modality: 'Individual', observation: 'Evaluación integradora de diseño de lenguajes' },
  ],
  rules: ['Nota mínima aprobatoria: 12.', 'Entrega de código limpio y documentado.'],
  antiPlagiarismPolicy: {
    maxSimilarityPercent: 20,
    aiPolicy: 'Permitido para análisis comparativo de sintaxis y soporte de depuración.',
    repositoryDelivery: 'Repositorio Git con pruebas unitarias.'
  },
  weeklySchedule: build18Weeks([
    'Evolución y Clasificación de Lenguajes de Programación',
    'Gramáticas Libres de Contexto y Jerarquía de Chomsky',
    'Análisis Léxico, Sintáctico y Árboles AST',
    'Paradigmas Imperativo y Declarativo',
    'Práctica Calificada 1 (PC1) - Gramáticas y Sintaxis',
    'Sistemas de Tipos: Estático, Dinámico, Fuerte y Débil',
    'Inferencia de Tipos y Polimorfismo Paramétrico',
    'Paradigma Funcional: Inmutabilidad, Lambdas y Currying',
    'Gestión de Memoria: Stack, Heap y Recolección de Basura',
    'Modelo de Propiedad y Borrow Checker (Rust)',
    'Práctica Calificada 2 (PC2) - Memoria y Tipos',
    'Modelos de Concurrencia: Hilos, Corrutinas y Event Loop',
    'Manejo de Errores: Excepciones vs Resultados Monádicos',
    'Metaprogramación, Reflexión y Macros',
    'Evaluación de Laboratorios de Programación (LAB)',
    'Diseño e Implementación de un Intérprete Básico',
    'Tendencias Modernas: WebAssembly y DSLs',
    'Examen Final Integrador (EXFN)'
  ])
};

const SYLLABUS_SOFTWARE_AVANZADO: ParsedSyllabus = {
  id: '100000SI60',
  generalInfo: {
    courseCode: '100000SI60',
    courseName: 'Desarrollo de Software Avanzado',
    semester: '2026 - Ciclo 2 Agosto',
    credits: 4,
    modality: 'Presencial',
    weeklyHours: 4,
    careers: ['Ingeniería de Sistemas e Informática'],
  },
  learningGoal: 'Construir arquitecturas de software robustas basadas en Domain-Driven Design (DDD), CQRS y microservicios orientados a eventos.',
  formula: '20% [PC1] + 20% [PC2] + 20% [TB] + 40% [EXFN]',
  evaluations: [
    { id: 'ev-dsa-1', type: 'PC1', description: 'Práctica Calificada 1: Modelado Estratégico DDD', week: 5, weightPercent: 20, modality: 'Individual', observation: 'Bounded Contexts y Context Maps' },
    { id: 'ev-dsa-2', type: 'PC2', description: 'Práctica Calificada 2: Patrones Tácticos y CQRS', week: 11, weightPercent: 20, modality: 'Individual', observation: 'Agregados, Entidades y Commands' },
    { id: 'ev-dsa-3', type: 'TB', description: 'Trabajo Grupal de Microservicios', week: 15, weightPercent: 20, modality: 'Grupal', observation: 'Implementación en Spring Boot y MySQL' },
    { id: 'ev-dsa-4', type: 'EXFN', description: 'Examen Final Integrador', week: 18, weightPercent: 40, modality: 'Individual', observation: 'Defensa de arquitectura distribuida' },
  ],
  rules: ['Nota mínima aprobatoria: 12.'],
  antiPlagiarismPolicy: {
    maxSimilarityPercent: 20,
    aiPolicy: 'Uso ético y declarado de IA en arquitectura de software.',
    repositoryDelivery: 'Repositorio Git con arquitectura hexagonal/DDD.'
  },
  weeklySchedule: build18Weeks([
    'Introducción a DDD y Complejidad del Software',
    'Diseño Estratégico: Bounded Contexts y Ubiquitous Language',
    'Context Maps y Relaciones entre Equipos',
    'Arquitectura Limpia y Arquitectura Hexagonal vs DDD',
    'Práctica Calificada 1 (PC1) - Diseño Estratégico',
    'Patrones Tácticos: Entidades, Value Objects e Identidad',
    'Agregados y Reglas de Invarianza de Dominio',
    'Repositorios, Servicios de Dominio y Fábricas',
    'Patrón CQRS: Separación de Lectura y Escritura',
    'Event-Driven Architecture y Domain Events',
    'Práctica Calificada 2 (PC2) - Patrones Tácticos',
    'Microservicios con Spring Boot y JPA',
    'Transacciones Distribuidas y Patrón Saga',
    'Resiliencia: Circuit Breaker, Retries y Bulkhead',
    'Entrega de Trabajo Grupal de Microservicios (TB)',
    'Monitoreo Distribuido con Tracing y Métricas',
    'Seguridad en Microservicios y OAuth2',
    'Examen Final Integrador (EXFN)'
  ])
};

const SYLLABUS_REDES: ParsedSyllabus = {
  id: '100000SI62',
  generalInfo: {
    courseCode: '100000SI62',
    courseName: 'Redes y Comunicaciones',
    semester: '2026 - Ciclo 2 Agosto',
    credits: 3,
    modality: 'Presencial',
    weeklyHours: 4,
    careers: ['Ingeniería de Sistemas e Informática'],
  },
  learningGoal: 'Analizar, diseñar y configurar infraestructuras de red basadas en los modelos OSI y TCP/IP, enrutamiento, conmutación y seguridad.',
  formula: '30% [LAB] + 30% [PC] + 40% [EXFN]',
  evaluations: [
    { id: 'ev-ryc-1', type: 'PC', description: 'Práctica Calificada: Enrutamiento y Direccionamiento', week: 7, weightPercent: 30, modality: 'Individual', observation: 'Subnetting VLSM y protocolos de enrutamiento' },
    { id: 'ev-ryc-2', type: 'LAB', description: 'Talleres de Simulación en Packet Tracer', week: 14, weightPercent: 30, modality: 'Individual', observation: 'Configuración de VLANs y Trunks' },
    { id: 'ev-ryc-3', type: 'EXFN', description: 'Examen Final Integrador', week: 18, weightPercent: 40, modality: 'Individual', observation: 'Evaluación práctica de redes corporativas' },
  ],
  rules: ['Nota mínima aprobatoria: 12.'],
  antiPlagiarismPolicy: {
    maxSimilarityPercent: 20,
    aiPolicy: 'Permitido para análisis de configuraciones de red y diagnóstico.',
    repositoryDelivery: 'Topologías Packet Tracer documentadas.'
  },
  weeklySchedule: build18Weeks([
    'Modelos de Comunicación: OSI vs TCP/IP',
    'Capa Física y Medios de Transmisión',
    'Capa de Enlace: Direccionamiento MAC y Tramas Ethernet',
    'Protocolos ARP y Conmutación en Capa 2',
    'Capa de Red: Direccionamiento IPv4 y Subnetting FLSM',
    'Diseño de Redes Eficientes con Subnetting VLSM',
    'Práctica Calificada (PC) - Direccionamiento IPv4',
    'Introducción a IPv6 y Tipos de Direcciones',
    'Configuración de VLANs y Segmentación de Red',
    'Enlaces Troncales 802.1Q y VTP',
    'Enrutamiento Inter-VLAN (Router on a Stick)',
    'Enrutamiento Estático y Rutas por Defecto',
    'Protocolos de Enrutamiento Dinámico: OSPF',
    'Laboratorio de Simulación y Packet Tracer (LAB)',
    'Capa de Transporte: Comparativa TCP vs UDP',
    'Listas de Control de Acceso (ACLs) y Seguridad',
    'Protocolos de Aplicación: DNS, DHCP, HTTP y SSH',
    'Examen Final Integrador (EXFN)'
  ])
};

/**
 * Registro de sílabos oficiales UTP indexado por código y nombres canónicos.
 */
export const OFFICIAL_SYLLABUS_REGISTRY: Record<string, ParsedSyllabus> = {
  // Códigos
  '100000SI65': SYLLABUS_DESARROLLO_WEB,
  '100000SI58': SYLLABUS_INVESTIGACION,
  '100000SI66': SYLLABUS_GESTION_TI,
  '100000SI67': SYLLABUS_COMUNICACION,
  '100000SI68': SYLLABUS_CLOUD,
  '100000SI69': SYLLABUS_LENGUAJES,
  '100000SI60': SYLLABUS_SOFTWARE_AVANZADO,
  '100000SI62': SYLLABUS_REDES,
  // Nombres canónicos
  'DESARROLLO WEB INTEGRADO': SYLLABUS_DESARROLLO_WEB,
  'FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS': SYLLABUS_INVESTIGACION,
  'FORMACION PARA LA INVESTIGACION - SISTEMAS': SYLLABUS_INVESTIGACION,
  'GESTIÓN DEL SERVICIO TI': SYLLABUS_GESTION_TI,
  'GESTION DEL SERVICIO TI': SYLLABUS_GESTION_TI,
  'HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA': SYLLABUS_COMUNICACION,
  'HERRAMIENTAS PARA LA COMUNICACION EFECTIVA': SYLLABUS_COMUNICACION,
  'SERVICIOS CLOUD': SYLLABUS_CLOUD,
  'LENGUAJES DE PROGRAMACIÓN': SYLLABUS_LENGUAJES,
  'LENGUAJES DE PROGRAMACION': SYLLABUS_LENGUAJES,
  'DESARROLLO DE SOFTWARE AVANZADO': SYLLABUS_SOFTWARE_AVANZADO,
  'REDES Y COMUNICACIONES': SYLLABUS_REDES,
};

function normalizeClean(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/-\s*\d{4,6}$/g, '')
    .trim();
}

/**
 * Busca el sílabo en el registro en memoria o en el almacenamiento local del estudiante.
 */
export function getSyllabusForCourse(courseIdentifier: string): ParsedSyllabus | null {
  if (!courseIdentifier) return null;
  const rawClean = courseIdentifier.trim().toUpperCase();

  // 1. Registro directo por clave exacta
  if (OFFICIAL_SYLLABUS_REGISTRY[rawClean]) {
    return OFFICIAL_SYLLABUS_REGISTRY[rawClean];
  }

  // 2. Registro por normalización
  const normQuery = normalizeClean(courseIdentifier);
  for (const [key, val] of Object.entries(OFFICIAL_SYLLABUS_REGISTRY)) {
    const normKey = normalizeClean(key);
    if (normKey === normQuery || normKey.includes(normQuery) || normQuery.includes(normKey)) {
      return val;
    }
  }

  // 3. Coincidencia por palabras clave
  if (normQuery.includes('comunicacion') || normQuery.includes('efectiva')) return SYLLABUS_COMUNICACION;
  if (normQuery.includes('web') || normQuery.includes('desarrollo web')) return SYLLABUS_DESARROLLO_WEB;
  if (normQuery.includes('investigacion') || normQuery.includes('sistemas')) return SYLLABUS_INVESTIGACION;
  if (normQuery.includes('servicio') || normQuery.includes('ti') || normQuery.includes('gestion')) return SYLLABUS_GESTION_TI;
  if (normQuery.includes('cloud') || normQuery.includes('servicios cloud')) return SYLLABUS_CLOUD;
  if (normQuery.includes('lenguajes') || normQuery.includes('programacion')) return SYLLABUS_LENGUAJES;

  // 4. Verificar almacenamiento local dinámico del estudiante
  const cached = getAllCachedSyllabi();
  if (cached[courseIdentifier]) return cached[courseIdentifier];
  if (cached[rawClean]) return cached[rawClean];

  for (const syllabus of Object.values(cached)) {
    const sCode = syllabus.generalInfo?.courseCode?.toUpperCase() || '';
    const sName = syllabus.generalInfo?.courseName?.toUpperCase() || '';
    if (
      (sCode && sCode === rawClean) ||
      (sName && (sName.includes(rawClean) || rawClean.includes(sName)))
    ) {
      return syllabus;
    }
  }

  return null;
}

/**
 * Convierte los sílabos registrados en la lista de CourseEvaluation
 * para que TodayView, el Horario y el Copilot usen las evaluaciones oficiales.
 */
export function getAllEvaluationsFromRegistry(): CourseEvaluation[] {
  const result: CourseEvaluation[] = [];
  const allSyllabi = { ...OFFICIAL_SYLLABUS_REGISTRY, ...getAllCachedSyllabi() };

  for (const syllabus of Object.values(allSyllabi)) {
    if (!syllabus.evaluations) continue;
    for (const ev of syllabus.evaluations) {
      if (!result.some((r) => r.id === ev.id && r.courseName === syllabus.generalInfo.courseName)) {
        result.push({
          id: ev.id,
          courseName: syllabus.generalInfo.courseName,
          code: ev.type,
          fullName: ev.description,
          week: ev.week,
          weightPercent: ev.weightPercent,
          modality: ev.modality,
          description: ev.observation || ev.description,
          rules: ev.rules || syllabus.rules,
        });
      }
    }
  }

  return result;
}

export const KNOWN_SYLLABUS_MAP: Record<string, { syllabusUrl: string; name: string }> = {};
