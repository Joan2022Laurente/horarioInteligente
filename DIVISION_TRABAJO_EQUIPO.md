# División de Trabajo — Horario Inteligente UTP

**Repo:** `github.com/Joan2022Laurente/horarioInteligente`  
**Stack:** Angular 17 · Spring Boot 3 · Supabase · OpenRouter

> La lógica de la UTP (autenticación SSO, horarios, sílabos) la maneja la **API Externa Institucional**, un servicio independiente que ya está desplegado. Este proyecto solo la consume. Cada módulo es independiente.

---

```
Angular  →  Spring Boot  →  API Externa UTP  →  Portal UTP
                         →  OpenRouter (IA)  →  LLM
                         →  Supabase (DB)    →  PostgreSQL
```

---

## Módulo 1 — Joan · IA & Tech Lead

Integra el chat con el LLM usando Streaming y Function Calling. La IA recibe el horario real del alumno y puede consultar herramientas para responder preguntas académicas.

**Backend**
```
application/service/AiAssistantService.java         ← Orquesta el loop de herramientas
application/service/tool/AcademicToolService.java   ← Herramientas: horario, sílabo, tareas
domain/port/in/AiAssistantServicePort.java
presentation/controller/AiChatController.java       ← Endpoint SSE /ai/chat/stream
```

**Frontend**
```
features/ai-assistant/ai-assistant-modal.component.ts
features/ai-assistant/chat-message-bubble.component.ts
features/ai-assistant/markdown-renderer.component.ts
data/services/ai-assistant.service.ts
```

---

## Módulo 2 — [Nombre] · Autenticación

Login con credenciales UTP. El backend las reenvía a la API Externa, que las valida contra el SSO institucional. Sin este módulo no funciona nada.

**Backend**
```
presentation/controller/AuthController.java         ← POST /auth/login
presentation/dto/AuthRequest.java
infrastructure/security/SecurityConfig.java
infrastructure/security/SecurityIdentityResolver.java
infrastructure/persistence/entity/StudentEntity.java
```

**Frontend**
```
features/auth/login-page.component.ts
data/services/auth.service.ts
core/interceptors/auth.interceptor.ts               ← Añade el token a todos los requests
```

---

## Módulo 3 — [Nombre] · Horario & Vista de Hoy

Muestra el horario semanal y las clases del día. Los datos vienen directamente de la API Externa y se cachean en Supabase para modo offline.

**Backend**
```
presentation/controller/ScheduleController.java     ← GET /schedule/{code}
infrastructure/persistence/entity/StudentScheduleEntity.java
infrastructure/persistence/repository/SpringDataScheduleRepository.java
```

**Frontend**
```
features/schedule/schedule-view.component.ts        ← Horario semanal
features/schedule/weekly-schedule.component.ts
features/schedule/class-detail-modal.component.ts
features/today/today-view.component.ts              ← Clases del día con cuenta regresiva
features/today/today.store.ts
data/services/schedule.service.ts
data/schedule-parser.ts
```

---

## Módulo 4 — [Nombre] · Sílabos & Base de Datos

Gestiona los sílabos oficiales de cada curso. Si no están en la BD, los descarga de la API Externa y los guarda automáticamente en Supabase para todos los usuarios.

**Backend**
```
presentation/controller/SyllabusController.java     ← GET /syllabus/{code}
infrastructure/persistence/entity/SyllabusEntity.java
infrastructure/persistence/repository/SpringDataSyllabusRepository.java
```

**Frontend**
```
features/syllabus/syllabus-view.component.ts
data/services/syllabus.service.ts                   ← LocalStorage → API Externa → Supabase
data/services/supabase.service.ts
data/syllabus/client-storage.ts
data/syllabus/types.ts
```

**Base de datos**
```
docs/database/supabase_schema_schedules_networking.sql
docs/database/supabase_marketplace_schema.sql
```

---

## Módulo 5 — [Nombre] · Tareas & Evaluaciones

Sincroniza las tareas y evaluaciones próximas desde el portal UTP sin que el alumno las cargue manualmente.

**Backend**
```
presentation/controller/TaskController.java         ← GET /tasks/upcoming
infrastructure/persistence/entity/TaskSyncEntity.java
infrastructure/persistence/repository/SpringDataTaskRepository.java
```

**Frontend**
```
features/tasks/task-sync.component.ts
data/services/task.service.ts
data/tasks/active-tasks.ts
data/tasks/homework-resumes.ts
domain/models/task.model.ts
```

---

## Archivos compartidos

| Archivo | Qué es |
|---|---|
| `pom.xml` | Dependencias Maven del backend |
| `frontend-angular/.env.example` | Plantilla de variables de entorno (pedir claves a Joan) |
| `frontend-angular/scripts/set-env.js` | Genera `environment.ts` desde `.env` |
| `frontend-angular/angular.json` | Configuración Angular |

---

## Setup local

```bash
# Clonar
git clone https://github.com/Joan2022Laurente/horarioInteligente.git

# Variables de entorno del frontend (pedir a Joan)
Copy-Item frontend-angular/.env.example frontend-angular/.env

# Backend
cd backend-springboot
./mvnw.cmd spring-boot:run

# Frontend (otra terminal)
cd frontend-angular
npm install
npm run start   # → http://localhost:4200
```
