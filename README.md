# Horario Inteligente UTP — Arquitectura Fullstack (DDD / CQRS)

Sistema académico integral de alto rendimiento desarrollado con **Spring Boot 3 (Java 17)** en el Backend bajo **Arquitectura Domain-Driven Design (DDD) con patrón CQRS**, y **Angular 18/19 Standalone** en el Frontend (Signals, TypeScript estricto y Glassmorphism UI).

---

## 1. Arquitectura del Sistema (DDD / CQRS)

```text
horario-inteligente-fullstack/
├── backend-springboot/              # Spring Boot 3 + Java 17 (DDD / CQRS Puro)
│   ├── pom.xml
│   └── src/main/java/com/utp/horario/
│       ├── application/             # Capa de Aplicación
│       │   ├── assembler/           # Ensambladores de DTO a Dominio
│       │   ├── command/             # Comandos CQRS inmutables
│       │   ├── dtos/                # Data Transfer Objects
│       │   ├── handle/              # Manejadores de Comandos (Command Handlers)
│       │   └── service/             # Servicios de aplicación y orquestador IA
│       │       └── tool/            # Bucle de herramientas del Asistente
│       ├── domain/model/            # Capa de Dominio (Puro)
│       │   ├── aggregate/           # Agregados y Raíces de Agregado
│       │   ├── enums/               # Tipos enumerados de negocio
│       │   ├── exceptions/          # Excepciones de dominio
│       │   ├── repositories/        # Interfaces de repositorios (ICRUD, Gateways)
│       │   └── value_objets/        # Objetos de Valor inmutables
│       ├── infraestructure/         # Capa de Infraestructura
│       │   ├── adapters/            # Adaptadores de Repositorio JPA
│       │   ├── entities/            # Entidades JPA relacionales
│       │   ├── external/            # Gateways externos (API Portal UTP, OpenRouter)
│       │   ├── mappers/             # Mapeadores Entidad-Dominio
│       │   ├── repositories/        # Interfaces Spring Data JPA
│       │   ├── security/            # Configuración de Seguridad y JWT
│       │   └── web/                 # Configuración Web MVC y resolución de identidad
│       └── interfaces/rest/         # Capa de Interfaces REST
│           ├── dto/                 # Request/Response payloads
│           └── controllers          # Endpoints (/api/v1/auth, /schedule, /tasks, /syllabus, /ai)
│
├── frontend-angular/                # Angular 18/19 (Signals & Standalone Components)
│   ├── src/app/
│   │   ├── domain/                  # Modelos TypeScript tipados (1:1 con DTOs)
│   │   ├── data/services/           # Servicios HTTP con Signals reactivos
│   │   └── features/                # Módulos de interfaz (Horario, Sílabos, Tareas, IA)
│   └── styles.css                   # Sistema de diseño Hi-DPI Glassmorphism
│
└── docs/database/                   # Scripts y Guías de Base de Datos
    ├── schema_mysql_workbench.sql   # Script SQL oficial para MySQL Workbench
    └── GUIA_MYSQL_WORKBENCH.md      # Guía paso a paso para evaluación y sustentación
```

---

## 2. Base de Datos y MySQL Workbench

El backend soporta **MySQL** para desarrollo local y sustentación docente con **MySQL Workbench**, así como **H2 in-memory** (fallback automático sin configuración) y **PostgreSQL / Supabase** en producción.

### Guía de Uso en MySQL Workbench
1. Abre **MySQL Workbench** y conéctate a tu servidor MySQL local (puerto 3306).
2. Abre y ejecuta el script:
   [`docs/database/schema_mysql_workbench.sql`](docs/database/schema_mysql_workbench.sql)
3. Esto crea la base de datos `horariodb` con las 5 tablas del dominio y registros reales de prueba.
4. Para ver la guía completa con capturas e instrucciones para generar el **Diagrama EER**, consulta:
   👉 [**GUÍA OFICIAL MYSQL WORKBENCH**](docs/database/GUIA_MYSQL_WORKBENCH.md)

---

## 3. Ejecución del Proyecto

### Backend (Spring Boot 3)

#### Con MySQL Local (Recomendado para evaluación):
```bash
cd backend-springboot
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=mysql
```

#### Modo Predeterminado (Fallback H2 en memoria, sin dependencias externas):
```bash
cd backend-springboot
.\mvnw.cmd spring-boot:run
```

* **Base URL de la API:** `http://localhost:8080/api/v1`
* **Consola H2 (si se usa modo fallback):** `http://localhost:8080/h2-console` (`jdbc:h2:mem:horariodb`, User: `sa`)

---

### Frontend (Angular)

```bash
cd frontend-angular
npm install
npm start
```
* **URL de Aplicación:** `http://localhost:4200`

---

## 4. Endpoints Principales de la API

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Autenticación de alumno y emisión de JWT |
| `GET` | `/api/v1/auth/me` | Obtener perfil del estudiante autenticado |
| `GET` | `/api/v1/schedule` | Obtener horario oficial del ciclo activo |
| `GET` | `/api/v1/tasks` | Consultar tareas y evaluaciones sincronizadas |
| `GET` | `/api/v1/syllabus/{courseCode}` | Obtener sílabo con fórmulas de evaluación |
| `GET` | `/api/v1/marketplace` | Listar publicaciones del marketplace académico |
| `POST` | `/api/v1/ai/chat` | Consulta al Copiloto Académico IA con bucle de herramientas |

---

## 5. Producción (Heroku)
* **Despliegue Activo:** [https://horario-inteligente-utp-31065a33a7ec.herokuapp.com/](https://horario-inteligente-utp-31065a33a7ec.herokuapp.com/)
