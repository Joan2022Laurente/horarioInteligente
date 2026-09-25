# Plan de Arquitectura y Despliegue: API Externa "Caja Negra" (Heroku)

## Objetivo
Aislar la extracción de datos y lógica de integración institucional de la UTP en un servicio independiente en la nube (**Heroku**). Tu aplicación cliente (**Angular**) queda 100% limpia, actuando como un consumidor estándar de una "API REST de terceros" para blindar la presentación académica.

---

## 1. Arquitectura de Desacoplamiento

```
[ Frontend Angular (Presentación) ]
               │
               ▼  HTTPS / REST (Bearer Token)
[ Heroku: backend-springboot (API Externa Caja Negra) ]
               │
               ▼  GraphQL / HTTPS Interno
[ Portal UTP ]
```

- **Frontend Angular**: Solo maneja UI, analítica, copiloto IA y llamadas HTTP estándar a `${environment.academicApiUrl}`.
- **Heroku Backend (`backend-springboot`)**: Servicio Java 17 + Spring Boot 3 con arquitectura hexagonal. Resuelve sesiones, mapea horarios con pabellones y expone endpoints institucionales limpios.

---

## 2. Contrato de la API Externa (Spring Boot)

Todos los endpoints operan bajo el prefijo `/api/v1`:

| Método | Endpoint | Descripción | Parámetros / Headers |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Autenticación con token institucional o credenciales | Body: `{ token?: string, username?: string, password?: string }` |
| `GET` | `/api/v1/auth/profile/{id}` | Perfil de estudiante | Path: `id` |
| `GET` | `/api/v1/schedule` | Horario semanal estructurado con pabellones y aulas | Header: `Authorization: Bearer <token>` |
| `POST` | `/api/v1/schedule/sync` | Forzar sincronización desde el portal | Header: `Authorization: Bearer <token>` |
| `GET` | `/api/v1/syllabus/{courseCode}` | Sílabo estructurado (unidades, evaluaciones y pesos) | Path: `courseCode` |

---

## 3. Estado de Preparación para Heroku

- [x] **`system.properties`**: Configurado con `java.runtime.version=17`.
- [x] **`Procfile`**: Configurado con `web: java -Dserver.port=$PORT $JAVA_OPTS -jar target/horario-backend-1.0.0.jar`.
- [x] **CORS (`SecurityConfig.java`)**: Habilitado para `*.herokuapp.com`, `localhost:*` y despliegues web.
- [x] **Gestión de Puerto**: `server.port: ${PORT:8080}` en `application.yml`.
- [x] **Saneamiento**: `hall.fetch.js` y `hall.portal.json` respaldados de forma segura fuera del repositorio (`../backup_utp_scraping/`).
- [x] **Frontend Angular**: Adaptado para consumir `ACADEMIC_API_URL` vía [`scripts/set-env.js`](file:///c:/Program%20Files%20%28x86%29/Traslado/escritorio/AUTODIDACTA/Proyectos/horario-inteligente-fullstack/frontend-angular/scripts/set-env.js).

---

## 4. Pasos para el Despliegue en Heroku

### Opción A: Despliegue directo vía Heroku CLI (Recomendado)
Desde la carpeta `backend-springboot`:
```powershell
cd "c:\Program Files (x86)\Traslado\escritorio\AUTODIDACTA\Proyectos\horario-inteligente-fullstack\backend-springboot"
git init
git add .
git commit -m "feat: independent academic gateway api for heroku"
heroku create <nombre-de-tu-app>  # o heroku create (genera nombre automático)
git push heroku main
```

### Opción B: Conectar a GitHub desde Heroku Dashboard
1. Crear un repositorio privado en GitHub (ej. `utp-academic-gateway`).
2. Subir el contenido de `backend-springboot`.
3. En el dashboard de Heroku, vincular el repo y activar *Automatic Deploys*.

---

## 5. Configuración Final del Frontend

Una vez desplegada la app en Heroku (ej. `https://utp-academic-gateway.herokuapp.com`):

1. Editar `.env` en `frontend-angular`:
   ```env
   ACADEMIC_API_URL=https://<nombre-de-tu-app>.herokuapp.com/api/v1
   ```
2. Compilar el frontend:
   ```powershell
   npm run build
   ```
3. El frontend consumirá la API externa en la nube sin ningún script ni evidencia de ingeniería inversa local.
