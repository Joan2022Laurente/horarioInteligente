# 📋 División de Trabajo — Horario Inteligente UTP
> **Repositorio:** `github.com/Joan2022Laurente/horarioInteligente`
> **Stack:** Angular 17 + Spring Boot 3 + Supabase + OpenRouter (IA)
> **Nota clave:** La complejidad de integración con el portal académico de la UTP es absorbida completamente por la **API Externa Institucional** (servicio independiente ya desplegado). Este proyecto simplemente **la consume**. Cada integrante trabaja sobre su módulo sin tocar el core de los demás.

---

## 🗺️ Arquitectura en una línea

```
[Angular Frontend] → [Spring Boot Gateway] → [API Externa UTP] → Portal UTP
                                          → [OpenRouter IA]    → LLM (IA)
                                          → [Supabase DB]      → PostgreSQL
```

---

## 👤 Integrante 1 — Joan Laurente · *Tech Lead / Módulo IA*

> **Responsabilidad:** Cerebro del asistente. El módulo más complejo del sistema. Integra el LLM con herramientas académicas en tiempo real mediante Streaming SSE y Function Calling (ReAct Loop).

### Archivos a exponer

**Backend — Núcleo IA:**
```
backend-springboot/src/main/java/com/utp/horario/
├── application/service/
│   ├── AiAssistantService.java          ← Orquestador del loop ReAct (Tool Calling)
│   └── tool/
│       └── AcademicToolService.java     ← 4 herramientas: horario, sílabo, evaluaciones, syllabus
├── domain/port/in/
│   └── AiAssistantServicePort.java      ← Contrato del servicio de IA
└── presentation/controller/
    └── AiChatController.java            ← Endpoint SSE /api/v1/ai/chat/stream
```

**Frontend — UI del Asistente:**
```
frontend-angular/src/app/features/ai-assistant/
├── ai-assistant-modal.component.ts      ← Modal de chat completo con streaming
├── chat-message-bubble.component.ts     ← Burbujas con Markdown, stickers y herramientas
├── markdown-renderer.component.ts       ← Renderizador de Markdown con highlight
└── matrix-orb.component.ts             ← Orbe animado "Copiloto"

frontend-angular/src/app/data/services/
└── ai-assistant.service.ts             ← Lógica SSE cliente, rate limiting, session_id
```

### Lo que hace este módulo *(para la presentación)*
- El usuario escribe en el chat → el frontend abre una conexión SSE al backend
- El backend envía el mensaje al LLM con un **System Prompt** que incluye el horario real del alumno
- El LLM decide llamar herramientas (`getScheduleForToday`, `getCourseSyllabus`, etc.)
- El backend ejecuta las herramientas contra la API Externa y Supabase, devuelve datos al LLM
- El LLM redacta la respuesta final y se transmite **token a token** al usuario en tiempo real

---

## 👤 Integrante 2 — [Nombre] · *Módulo Autenticación & Perfil*

> **Responsabilidad:** Login institucional UTP y gestión del perfil del estudiante. Es la puerta de entrada: sin autenticación no funciona nada.

### Archivos a exponer

**Backend:**
```
backend-springboot/src/main/java/com/utp/horario/
├── presentation/controller/
│   └── AuthController.java                      ← POST /api/v1/auth/login
├── presentation/dto/
│   └── AuthRequest.java                         ← { user, password }
├── infrastructure/security/
│   ├── SecurityConfig.java                      ← CORS + permisos de endpoints
│   ├── SecurityIdentityResolver.java            ← Resuelve identidad desde token
│   ├── CurrentStudent.java                      ← Anotación @CurrentStudent
│   └── CurrentStudentArgumentResolver.java      ← Inyección del estudiante en controladores
└── infrastructure/persistence/entity/
    └── StudentEntity.java                       ← Entidad JPA tabla 'students'
```

**Frontend:**
```
frontend-angular/src/app/features/auth/
└── login-page.component.ts                      ← Pantalla de login con credenciales UTP

frontend-angular/src/app/data/services/
└── auth.service.ts                              ← Llama a /auth/login, guarda sesión local

frontend-angular/src/app/core/interceptors/
└── auth.interceptor.ts                          ← Añade Bearer Token a todos los requests HTTP
```

### Lo que hace este módulo *(para la presentación)*
- El alumno ingresa sus credenciales UTP → el backend las reenvía a la **API Externa**
- La API Externa valida contra el SSO institucional y devuelve el token de sesión
- El backend guarda el perfil del alumno en Supabase y retorna la sesión al frontend
- Todos los demás módulos dependen de que este token esté disponible

---

## 👤 Integrante 3 — [Nombre] · *Módulo Horario & Vista de Hoy*

> **Responsabilidad:** El corazón visual del producto. Muestra el horario semanal y la vista diaria "Hoy" con las clases en tiempo real. Los datos vienen **100% de la API Externa**.

### Archivos a exponer

**Backend:**
```
backend-springboot/src/main/java/com/utp/horario/
├── presentation/controller/
│   └── ScheduleController.java                    ← GET /api/v1/schedule/{code}
├── infrastructure/persistence/entity/
│   └── StudentScheduleEntity.java                 ← Entidad JPA tabla 'student_schedules'
└── infrastructure/persistence/repository/
    └── SpringDataScheduleRepository.java          ← Repositorio JPA del horario
```

**Frontend:**
```
frontend-angular/src/app/features/schedule/
├── schedule-view.component.ts                     ← Vista de horario semanal completo
├── weekly-schedule.component.ts                   ← Grilla lunes–sábado con colores por curso
└── class-detail-modal.component.ts               ← Modal de detalle (aula, docente, tema)

frontend-angular/src/app/features/today/
├── today-view.component.ts                        ← Vista "Hoy": clases del día en vivo
└── today.store.ts                                 ← Estado reactivo de la vista diaria

frontend-angular/src/app/data/services/
└── schedule.service.ts                            ← Llama a /schedule, parsea y cachea horario

frontend-angular/src/app/data/
└── schedule-parser.ts                             ← Parseo del JSON de horario de la API Externa
```

### Lo que hace este módulo *(para la presentación)*
- Al hacer login, se obtiene el horario completo del semestre desde la API Externa
- El horario se persiste en Supabase (`student_schedules`) para contingencia sin conexión
- La vista semanal organiza las clases en una grilla con aulas y docentes
- La vista "Hoy" filtra las clases del día actual y muestra una cuenta regresiva

---

## 👤 Integrante 4 — [Nombre] · *Módulo Sílabos & Base de Datos*

> **Responsabilidad:** Repositorio de conocimiento académico. Gestiona los sílabos oficiales de cada curso: su descarga desde la API, persistencia en Supabase y exposición al frontend y a la IA.

### Archivos a exponer

**Backend:**
```
backend-springboot/src/main/java/com/utp/horario/
├── presentation/controller/
│   └── SyllabusController.java                    ← GET /api/v1/syllabus/{courseCode}
├── infrastructure/persistence/entity/
│   └── SyllabusEntity.java                        ← Entidad JPA tabla 'official_syllabi'
└── infrastructure/persistence/repository/
    └── SpringDataSyllabusRepository.java          ← Repositorio JPA de sílabos
```

**Frontend:**
```
frontend-angular/src/app/features/syllabus/
└── syllabus-view.component.ts                     ← Vista detallada del sílabo + temario semanal

frontend-angular/src/app/data/services/
├── syllabus.service.ts                            ← Cache local → API Externa → Supabase
└── supabase.service.ts                            ← Cliente REST directo de Supabase

frontend-angular/src/app/data/syllabus/
├── client-storage.ts                              ← Caché en LocalStorage del sílabo
├── official-registry.ts                           ← Registro en memoria de sílabos cargados
└── types.ts                                       ← Tipos TypeScript del sílabo
```

**Esquemas SQL:**
```
docs/database/
├── supabase_schema_schedules_networking.sql       ← DDL tabla students + student_schedules
├── supabase_community_schema.sql                  ← DDL tablas comunidad
└── supabase_marketplace_schema.sql               ← DDL tabla marketplace
```

### Lo que hace este módulo *(para la presentación)*
- Al consultar un curso, busca el sílabo en LocalStorage → Supabase → API Externa (en ese orden)
- Si lo descarga de la API, lo guarda en Supabase (upsert) para que **todos** se beneficien en el futuro
- La IA también consume este módulo como fuente de datos para responder sobre temario y evaluaciones

---

## 👤 Integrante 5 — [Nombre] · *Módulo Tareas & Evaluaciones*

> **Responsabilidad:** Sincronización y visualización de tareas y evaluaciones próximas. Obtenidos en tiempo real desde el portal UTP, sin que el alumno las registre manualmente.

### Archivos a exponer

**Backend:**
```
backend-springboot/src/main/java/com/utp/horario/
├── presentation/controller/
│   └── TaskController.java                        ← GET /api/v1/tasks/upcoming
├── infrastructure/persistence/entity/
│   └── TaskSyncEntity.java                        ← Entidad JPA de sincronización de tareas
└── infrastructure/persistence/repository/
    └── SpringDataTaskRepository.java              ← Repositorio JPA de tareas
```

**Frontend:**
```
frontend-angular/src/app/features/tasks/
└── task-sync.component.ts                         ← Vista de tareas y evaluaciones próximas

frontend-angular/src/app/data/services/
└── task.service.ts                                ← Llama a /tasks, ordena por fecha

frontend-angular/src/app/data/tasks/
├── active-tasks.ts                                ← Tareas activas en memoria
├── homework-resumes.ts                            ← Resúmenes de entregas pendientes
└── instruction-cleaner.ts                        ← Limpia instrucciones HTML del portal UTP

frontend-angular/src/app/domain/models/
└── task.model.ts                                  ← Modelo de tarea / evaluación
```

### Lo que hace este módulo *(para la presentación)*
- Al hacer login, sincroniza automáticamente las tareas próximas desde el portal UTP
- Las organiza por fecha de entrega y curso, diferenciando tareas de evaluaciones calificadas
- La IA también puede consultar este módulo cuando el alumno pregunta "¿qué tengo pendiente?"

---

## 📁 Archivos compartidos (todos deben conocerlos)

| Archivo | Para qué sirve |
|---|---|
| `pom.xml` | Dependencias Maven del backend (Spring AI, H2, Supabase REST, etc.) |
| `system.properties` | Versión de Java 17 declarada para Heroku |
| `frontend-angular/angular.json` | Configuración del proyecto Angular |
| `frontend-angular/tsconfig.json` | Configuración TypeScript del frontend |
| `frontend-angular/.env.example` | Plantilla de las variables de entorno necesarias |
| `frontend-angular/scripts/set-env.js` | Genera `environment.ts` desde `.env` al buildear |

---

## ⚙️ Setup rápido para correr en local

```bash
# 1. Clonar el repositorio
git clone https://github.com/Joan2022Laurente/horarioInteligente.git
cd horarioInteligente

# 2. Crear .env con las claves (pedir a Joan)
Copy-Item frontend-angular/.env.example frontend-angular/.env
# Editar frontend-angular/.env con los valores reales

# 3. Levantar el backend (en una terminal)
cd backend-springboot
./mvnw.cmd spring-boot:run

# 4. Levantar el frontend (en otra terminal)
cd frontend-angular
npm install
npm run start
# → http://localhost:4200
```

> Las variables de entorno del backend para producción en Heroku (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY`) las gestiona **Joan** como Tech Lead.

---

## 🏛️ Por qué el sistema es simple de entender

El proyecto **no reimplementa** la lógica de autenticación institucional, el sistema de horarios de la UTP, ni la extracción de sílabos del portal. Toda esa complejidad está delegada a la **API Externa Institucional** (servicio independiente y ya operacional en producción).

Este repositorio únicamente se encarga de:

1. **Presentar** la información de forma elegante y reactiva (Angular 17 con Signals)
2. **Orquestar** las llamadas a la API Externa (Spring Boot como Gateway)
3. **Cachear** los datos en Supabase para rendimiento y modo offline
4. **Potenciar** la experiencia con IA conversacional en tiempo real *(módulo Joan → OpenRouter)*
