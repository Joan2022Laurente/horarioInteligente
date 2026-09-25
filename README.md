# Horario Inteligente UTP — Arquitectura Fullstack (Spring Boot + Angular)

Proyecto modular y desacoplado de alto rendimiento basado en **Arquitectura Hexagonal (Ports & Adapters)** en el Backend y **Arquitectura Modular basada en Signals y Standalone Components** en el Frontend.

---

## 1. Estructura del Repositorio

```text
horario-inteligente-fullstack/
├── backend-springboot/              # Spring Boot 3 + Java 17 (Hexagonal Architecture)
│   ├── pom.xml
│   └── src/main/java/com/utp/horario/
│       ├── domain/                  # Entidades inmutables y Puertos (In/Out)
│       ├── application/             # Casos de uso y motor de parsing de sílabos
│       ├── infrastructure/          # Adaptadores JPA, Clientes UTP, OpenRouter, Seguridad
│       └── presentation/            # Controladores REST (/api/v1/auth, /schedule, /syllabus, /ai, /tasks)
│
└── frontend-angular/                # Angular 18/19 Standalone (Signals & Glassmorphism Design)
    ├── src/app/
    │   ├── domain/                  # Modelos TypeScript tipados (1:1 con DTOs)
    │   ├── data/services/           # Servicios HTTP y reactividad con Signals
    │   └── features/                # Vistas modulares: Horario, Sílabos, Tareas, Copiloto IA
    └── styles.css                   # Sistema de diseño Hi-DPI Glassmorphism
```

---

## 2. Ejecución Local

### Backend (Spring Boot 3 + Java 17)
```bash
cd backend-springboot
mvn spring-boot:run
```
* **Puerto**: `http://localhost:8080/api/v1`
* **Consola H2**: `http://localhost:8080/api/v1/h2-console` (JDBC URL: `jdbc:h2:mem:horariodb`, User: `sa`)

### Frontend (Angular)
```bash
cd frontend-angular
npm install
npm start
```
* **Puerto**: `http://localhost:4200`
