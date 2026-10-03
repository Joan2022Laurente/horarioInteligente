# Division de Trabajo — Horario Inteligente UTP

**Repositorio:** github.com/Joan2022Laurente/horarioInteligente
**Stack:** Angular (frontend) + Spring Boot DDD Puro CQRS (backend) + MySQL (base de datos) + OpenRouter (IA)

---

## Como funciona el sistema en una frase

El alumno inicia sesion con sus credenciales UTP, el sistema trae su horario real desde el portal de la universidad, lo muestra de forma bonita y ademas tiene un asistente de IA que puede responder preguntas sobre sus clases, tareas y silabos.

La parte dificil (conectarse al portal de la UTP, autenticar al alumno, obtener el horario oficial) ya esta resuelta por una API externa que el equipo tiene desplegada. Nosotros solo la llamamos desde nuestro backend. Por eso el codigo nuestro es relativamente simple: recibe datos, los guarda, los muestra.

```
El alumno usa el frontend (Angular)
   -> que le habla a nuestro backend (Spring Boot)
      -> que le pide datos a la API de la UTP (ya hecha)
      -> que guarda cosas en la base de datos (MySQL)
      -> que le pregunta cosas a la IA (OpenRouter)
```

---

## Modulo 1 — Joan — La Inteligencia Artificial

**Que hace esta parte en palabras simples:**
Es el chat que aparece en la app. El alumno escribe "que tengo hoy?" y el sistema le responde con sus clases reales, aula, horario y hasta los temas del silabo. No es un chatbot pre-programado con respuestas fijas: la IA analiza el contexto real del alumno (su horario, sus cursos, sus evaluaciones) y genera la respuesta en el momento.

Como funciona por dentro: el mensaje del alumno llega al backend, el backend se lo manda a un modelo de lenguaje (como ChatGPT pero de OpenRouter), el modelo dice "necesito saber el horario de hoy" y el backend va a buscarlo, se lo devuelve al modelo, y el modelo redacta la respuesta final. Todo esto pasa en segundos y la respuesta llega palabra por palabra (como cuando ves que ChatGPT escribe).

**Archivos que presento yo:**
```
Backend:
  application/service/AiAssistantService.java
  application/service/tool/AcademicToolService.java
  presentation/controller/AiChatController.java

Frontend:
  features/ai-assistant/ai-assistant-modal.component.ts
  features/ai-assistant/chat-message-bubble.component.ts
  features/ai-assistant/markdown-renderer.component.ts
  data/services/ai-assistant.service.ts
```

---

## Modulo 2 — [Nombre] — Login y Perfil del Alumno

**Que hace esta parte en palabras simples:**
Es la pantalla de inicio de sesion. El alumno pone su usuario y contrasena UTP, y el sistema verifica que sea un alumno real. Sin esto, nadie puede entrar a la app.

Cuando el alumno inicia sesion, el sistema guarda su nombre, carrera, campus y ciclo. Ese perfil se usa en todos lados: la IA lo usa para personalizar las respuestas, el horario lo usa para saber de quien cargar los datos, etc.

Piensalo como el portero del edificio. Si no pasas por aqui, no llegas a ninguna otra parte del sistema.

**Archivos que presento [Nombre]:**
```
Backend:
  presentation/controller/AuthController.java
  presentation/dto/AuthRequest.java
  infrastructure/security/SecurityConfig.java
  infrastructure/security/SecurityIdentityResolver.java
  infrastructure/persistence/entity/StudentEntity.java

Frontend:
  features/auth/login-page.component.ts
  data/services/auth.service.ts
  core/interceptors/auth.interceptor.ts
```

---

## Modulo 3 — [Nombre] — Horario y Vista de Hoy

**Que hace esta parte en palabras simples:**
Es la pantalla principal que todos van a ver todos los dias. Muestra el horario completo de la semana (lunes a sabado, con aulas, docentes y horarios) y una vista especial de "Hoy" que resalta solo las clases del dia actual con una cuenta regresiva.

Los datos no los inventamos nosotros: los obtenemos del portal real de la UTP en el momento en que el alumno inicia sesion. Despues los guardamos en nuestra base de datos porque el portal de la UTP puede ser lento o estar caido en cualquier momento, y asi la segunda vez que el alumno entre no dependemos de que la UTP responda: ya tenemos su horario guardado nosotros.

Piensalo como la app de Google Calendar pero solo con tus clases universitarias reales, actualizada automaticamente desde la UTP.

**Archivos que presento [Nombre]:**
```
Backend:
  presentation/controller/ScheduleController.java
  infrastructure/persistence/entity/StudentScheduleEntity.java
  infrastructure/persistence/repository/SpringDataScheduleRepository.java

Frontend:
  features/schedule/schedule-view.component.ts
  features/schedule/weekly-schedule.component.ts
  features/schedule/class-detail-modal.component.ts
  features/today/today-view.component.ts
  features/today/today.store.ts
  data/services/schedule.service.ts
  data/schedule-parser.ts
```

---

## Modulo 4 — [Nombre] — Silabos y Base de Datos

**Que hace esta parte en palabras simples:**
El silabo es el documento que dice que temas se ven semana a semana en cada curso, como se califica y cual es el logro del curso. Esta parte del sistema descarga esos silabos desde el portal de la UTP y los guarda en nuestra base de datos.

Por que guardarlo? Porque si el primer alumno en pedir el silabo de "Desarrollo Web" tarda 3 segundos en descargarlo, el segundo alumno que pida lo mismo lo recibe al instante porque ya esta guardado. Ademas la IA lo usa para responder preguntas como "que temas veran la proxima semana?".

Esta parte tambien es responsable de toda la estructura de la base de datos: las tablas, que campos tienen, como estan relacionadas.

**Archivos que presento [Nombre]:**
```
Backend:
  interfaces/rest/SyllabusController.java
  infraestructure/persistence/entity/SyllabusEntity.java
  infraestructure/persistence/repository/SpringDataSyllabusRepository.java

Frontend:
  features/syllabus/syllabus-view.component.ts
  data/services/syllabus.service.ts
  data/syllabus/client-storage.ts
  data/syllabus/types.ts

Base de datos:
  backend-springboot/src/main/resources/schema-mysql.sql
```

---

## Modulo 5 — [Nombre] — Tareas y Evaluaciones

**Que hace esta parte en palabras simples:**
Cuando el alumno entra a la app, el sistema automaticamente va al portal de la UTP y trae todas las tareas y evaluaciones que tiene pendientes, ordenadas por fecha. El alumno no tiene que registrar nada manualmente: todo aparece solo.

Piensalo como si tu app de recordatorios se sincronizara sola con lo que tu profesor subio al aula virtual, sin que tu tengas que hacer nada.

La IA tambien puede usar esta informacion: si el alumno pregunta "que tengo que entregar esta semana?", el sistema ya tiene los datos listos para responder.

**Archivos que presento [Nombre]:**
```
Backend:
  presentation/controller/TaskController.java
  infrastructure/persistence/entity/TaskSyncEntity.java
  infrastructure/persistence/repository/SpringDataTaskRepository.java

Frontend:
  features/tasks/task-sync.component.ts
  data/services/task.service.ts
  data/tasks/active-tasks.ts
  data/tasks/homework-resumes.ts
  domain/models/task.model.ts
```

---

## Archivos que todos deben conocer (son de todos)

| Archivo | Para que sirve |
|---|---|
| `pom.xml` | Lista de todas las librerias que usa el backend (como el package.json del frontend pero para Java) |
| `frontend-angular/.env.example` | Plantilla con las variables de entorno que necesitas para correr el proyecto. Pedirle las claves reales a Joan. |
| `frontend-angular/scripts/set-env.js` | Script que lee el archivo .env y genera la configuracion del Angular automaticamente |
| `frontend-angular/angular.json` | Configuracion general del proyecto Angular |
| `system.properties` | Le dice a Heroku que version de Java usar |

---

## Como correr el proyecto en tu computadora

**Paso 1: Clonar el repositorio**
```bash
git clone https://github.com/Joan2022Laurente/horarioInteligente.git
cd horarioInteligente
```

**Paso 2: Crear el archivo de configuracion del frontend**
```bash
# En la carpeta frontend-angular, copiar el archivo de ejemplo
Copy-Item frontend-angular/.env.example frontend-angular/.env
# Luego abrir frontend-angular/.env y completar los valores que te pase Joan
```

**Paso 3: Levantar el backend** (en una terminal)
```bash
cd backend-springboot
./mvnw.cmd spring-boot:run
# Esperar hasta ver "Started HorarioApplication" en la consola
```

**Paso 4: Levantar el frontend** (en otra terminal aparte)
```bash
cd frontend-angular
npm install
npm run start
# Abrir http://localhost:4200 en el navegador
```

Las claves de produccion (MySQL Aiven, OpenRouter) las maneja Joan. Para correr local solo necesitas el .env que el te comparte.
