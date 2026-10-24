# Sustentación — Módulo 1: Asistente IA + Servidor MCP (Joan)

> Documento de apoyo para la exposición. Mapea mi módulo (IA/MCP) archivo por archivo,
> con extractos reales del código, el flujo de punta a punta, las decisiones de diseño
> defendibles y un resumen breve de los demás módulos y la estructura de carpetas.

---

## 1. Panorama en una frase

El alumno escribe una pregunta en el chat de la app (o una IA externa se conecta por MCP) y
el sistema **no responde con texto fijo**: ejecuta un **ciclo agéntico (ReAct)** donde el modelo
de lenguaje decide cuáles **herramientas académicas reales** llamar (horario de hoy, sílabos,
cursos, evaluaciones), el backend las ejecuta contra datos reales y el modelo redacta la
respuesta final que llega **en streaming, palabra por palabra**.

```
                        ┌────────────────────────── MI MÓDULO ──────────────────────────┐
                        │                                                              │
 Alumno (Angular) ──► AiChatController ──► AgentOrchestratorServiceImpl ◄──► OpenRouter │
        SSE: model/delta/activity/tool/done      │            (ReAct, máx 5 iter.)      │
                        │                        ▼                                      │
                        │            AcademicToolService ──► MySQL (horario, sílabos)   │
                        │                        └──► IUtpPortalGateway ──► API externa │
                        │                                                               │
 IAs externas (Claude ──► McpServerController ──► AcademicToolRegistry ──┘              │
 Desktop, Inspector)      (JSON-RPC 2.0 + SSE)   (contrato único de las 4 tools)        │
                        └──────────────────────────────────────────────────────────────┘
```

**El detalle que más vale la pena explicar:** el mismo "cerebro" (las herramientas) se expone
por **dos puertas** — el chat interno del copiloto (`/ai/*`) y el servidor MCP público
(`/mcp/*`) — pero **un solo contrato** define las herramientas: `AcademicToolRegistry`.
No hay dos listas que puedan divergir.

---

## 2. Puerta 1 — `/ai/*`: el Copiloto del chat propio

### 2.1 `interfaces/rest/AiChatController.java` (~150 líneas) — entrada HTTP + protocolo SSE

Responsabilidades: resolver la identidad del estudiante, registrar su token en la pasarela,
abrir el stream SSE y servir la cuota diaria.

```java
@PostMapping(value = "/chat/stream", produces = TEXT_EVENT_STREAM_VALUE)
public ResponseBodyEmitter streamChatPost(...) { ... executeStreamEmitter(...); }
```

El protocolo SSE que inventamos para la demo (eventos tipados):

| Evento  | Contenido                                        | Quién lo usa en el frontend      |
|---------|--------------------------------------------------|----------------------------------|
| `model` | `{"model": "<modelo efectivo>"}`                 | Se registra en la consola        |
| `delta` | `{"delta": "texto..."}`                          | Efecto de escritura token a token|
| `activity` | fase de herramienta (`start/done/error` + argumentos) | Burbujas "está consultando…" |
| `tool`  | `{name}` (legacy, compatibilidad)                | Badges de herramientas           |
| `done`  | `[DONE]`                                         | cierre del stream                |

Extra reciente: al abrir el stream el backend ya anuncia **qué modelo responde** (`event: model`),
resuelto por el orquestador para que exista **una sola fuente de verdad** del modelo.

```java
final String effectiveModel = agentOrchestrator.resolveModel(model);
emitter.send("event: model\ndata: " + modelPayload + "\n\n");
```

Además expone `GET /ai/quota` (estado de la cuota diaria del alumno).

### 2.2 `application/service/AgentOrchestratorServiceImpl.java` (~730 líneas) — el orquestador ReAct

Es el corazón. Es el `@Primary` `AiAssistantService` (la implementación agéntica gana sobre la
simple heredada). Ideas clave:

**(a) Ciclo agéntico con tope duro:**

```java
private static final int MAX_ITERATIONS = 5;
```

Cada iteración: OpenRouter responde → si trae `tool_calls` se ejecutan y sus resultados entran
al historial con `role:"tool"` → el modelo vuelve a llamarse → si llega `finish_reason:"stop"`,
ese texto es la respuesta final.

**(b) El modelo ve un payload estándar OpenAI con las herramientas publicadas:**

```java
payload.put("tools", AcademicToolRegistry.getOpenAiToolDefinitions());
payload.put("tool_choice", "auto");
payload.put("temperature", 0.3);
payload.put("max_tokens", 1800);
payload.put("frequency_penalty", 0.25);
// session_id para sticky routing → mayor hit de prompt cache en el proveedor
payload.put("session_id", studentCode + "_" + LocalDate.now(LIMA));
```

**(c) Resiliencia multi-clave (failover) — pensando en la demo en vivo:**

```java
for (int i = 0; i < keyPool.size(); i++) {
    ...
    if (response.statusCode() == 429 || response.statusCode() == 401
            || response.statusCode() == 402 || response.statusCode() == 403) {
        log.warn("OpenRouter key #{} falló con status {}. Rotando...", i + 1, ...);
        continue;   // siguientes claves del pool
    }
    ...
}
```

5 claves configurables (YAML + env). Si una consume su cuota (429) rota a la siguiente sin
romper la experiencia. Si TODO falla: `fallbackMessage()` devuelve un mensaje útil que manda al
alumno a la pestaña de horario en vez de un error 500.

**(d) Acumulador de tool-calls en streaming** — los deltas de una llamada llegan fragmentados;
`ToolCallAccumulator` (id, type, name, `arguments` como StringBuilder) los reconstruye y con
`toAssistantToolCall()` los devuelve al formato estándar para el historial:

```java
private static class ToolCallAccumulator {
    String id = "";
    String type = "function";
    String name = "";
    StringBuilder arguments = new StringBuilder();
    ...
}
```

**(e) Rescate de invocaciones emitidas como texto** — problema real observado: ante
"¿qué temas tocan esta semana?" el modelo construía la llamada correcta pero la **escribía como
bloque JSON en el texto** (el proveedor no materializó el canal nativo `tool_calls`), la
herramienta nunca corría y el alumno veía el "plan narrado". Solución: leer el contenido,
extraer el JSON (bloque cercado u objeto suelto), **validar contra el registro** y convertirla
en una `tool_calls` sintética:

```java
// Respaldo: ciertos proveedores no materializan la estructura nativa
// tool_calls y el modelo emite la invocación como bloque JSON en el texto.
JsonNode rescued = rescueToolCalls(choiceMessage.path("content").asText(""));
if (rescued != null && !rescued.isEmpty()) {
    toolCalls = rescued;   // el flujo ReAct continúa igual
}
```

Punto de defensa: *no es un parche del caso* — valida `name` contra
`AcademicToolRegistry.getSupportedToolNames()`, así un JSON falso (p.ej. `drop_all_students`)
**no puede correr**. Cubre las dos rutas (streaming y no-streaming).

**(f) Ancla temporal académica** — el modelo **no sabe qué semana es**; esta se calcula en el
backend (horario de la interfaz o el snapshot persistido) y se inyecta en el prompt:

```java
String weekLine = (currentWeek != null && currentWeek > 0)
        ? "- Semana lectiva actual: " + currentWeek + " de " + totalWeeks + " ..."
        : "- Semana lectiva actual: NO CONOCIDA ...";
// CONTEXTO ACADÉMICO VIGENTE (datos verificados por el sistema: no los pidas...)
```

Ese ancla alimenta además un parámetro opcional `week` en `get_syllabus_details`
(`readWeekArgument` acota 1–18; ante basura devuelve `null` = sílabo completo, nunca un error).

**(g) Memoria conversacional acotada:** solo los **últimos 8 turnos** previos entran al prompt
(`buildMessages`). Menos tokens, menos ruido, y coherencia suficiente para por continuaciones
("¿qué temas tocan *ese* curso?" sin repetir el nombre).

### 2.3 `application/service/tool/AcademicToolRegistry.java` (~115 líneas) — el contrato único

Clase estática: **una sola definición** de las 4 herramientas en formato JSON Schema OpenAI,
reutilizada por el orquestador (payload) y por el servidor MCP (`tools/list`). También expone
helpers defensivos (`resolveCourseQuery` lee `course_query` con su alias histórico).

Las 4 herramientas: `get_today_schedule`, `get_enrolled_courses`, `get_syllabus_details`,
`get_upcoming_evaluations`. Ejemplo del esquema (nótese la defensa anti-alucinación en la
descripción):

```java
"course_query", Map.of("type","string", "description",
    "Nombre del curso o código exacto. NO inventes abreviaturas de 2 letras."),
"week", Map.of("type","integer", "description",
    "Semana lectiva (1 a 18) ...la forma recomendada cuando el estudiante pregunta por 'esta semana'"),
"required", List.of("course_query")
```

### 2.4 `application/service/tool/AcademicToolService.java` (~575 líneas) — las manos del agente

Implementa cada herramienta con datos reales y una cadena de resolución de identidad/curso:

- `getTodaySchedule(studentCode, dateIso)` → horario persistido (+fallback) del día, con
  **número de semana** incluido en el resultado (nace el ancla temporal).
- `getSyllabusDetails(studentCode, courseQuery, week)` — **resolución inversa del curso**: el
  alumno habla en natural ("desarrollo web"), la herramienta la traduce a código oficial:

```java
// 1. Resolver código/nombre exacto desde los cursos matriculados del alumno (PRIORIDAD ALTA)
enrolled = getEnrolledCourses(studentCode);
for (var ec : enrolled.courses()) {
    if (normEcName.contains(normQuery) || normQuery.contains(normEcName)
            || normEcCode.equalsIgnoreCase(normQuery)) {
        resolvedCourseCode = ec.courseCode(); ...
```

Con el `week` recibido aplica `applyWeekFilter` y devuelve **solo esa semana** (evaluaciones,
fórmula, temas) — mucho menos JSON al modelo en cada iteración.
- `resolveCurrentWeek(studentCode)` → fuente autoritativa del ancla (snapshot del horario).
- `getUpcomingEvaluations(studentCode, currentWeek)` → PCs/APF desde la semana actual +3.
- `resolveEffectiveStudentCode` / `resolveStudentToken` → identificador durable y token UTP
  con el que se consulta la API externa (nunca se sintetizan datos si no existe registro).

### 2.5 `application/service/DailyQuotaServiceImpl.java` (~82 líneas) — cuota de la demo

Límite diario configurable (6/día por alumno), exenciones para localhost/guest/admin, en
memoria (`ConcurrentHashMap`, reset por fecha). Nació para **no quedarnos sin demostración**:
con seguridad client-side (`daily-limiter.ts` en el frontend) y server-side, los pases no
queman las llamadas de OpenRouter.

```java
@Value("${app.rate-limit.daily-quota:6}") int dailyLimit,
@Value("${app.rate-limit.unlimited-emails:admin@utp.edu.pe}") List<String> unlimitedIdentifiers
```

---

## 3. Puerta 2 — `/mcp/*`: Servidor MCP público para IAs externas

### 3.1 `interfaces/rest/McpServerController.java` (~750 líneas) — JSON-RPC 2.0 sobre HTTP/SSE

Implementa de verdad el **Model Context Protocol** (versión `2024-11-05`): transporte SSE
(handshake → endpoint de mensajes) y también el transporte Streamable HTTP (POST directo).
Clientes objetivo: Claude Desktop, MCP Inspector, Cursor, acciones de IA externas.

```java
@Slf4j
@RestController
@RequestMapping({"/mcp", "/api/v1/mcp"})
public class McpServerController {
    static final String PROTOCOL_VERSION = "2024-11-05";
    static final String SERVER_NAME = "horario-inteligente-mcp";
```

**Su contrato de resiliencia (citarlo en la exposición — está en el Javadoc del encabezado):**

> - El canal HTTP responde siempre `200 OK` con un envelope JSON-RPC válido, salvo rechazo
>   de autenticación explícito (`401`).
> - Nunca se propaga una excepción no controlada: todo fallo degenera en un error JSON-RPC
>   (`-32603`) o en un resultado con `isError: true`.
> - **Nunca se sintetizan datos**: si el estudiante no tiene registro persistido, la respuesta
>   es un mensaje informativo explícito, no un dato inventado.

**Despacho de métodos** (la forma canónica del protocolo):

```java
switch (method) {
    case "initialize"   -> rpcResponse.put("result", initializeResult());
    case "ping"         -> rpcResponse.put("result", Map.of());
    case "tools/list"   -> rpcResponse.put("result", Map.of("tools", buildToolCatalogue()));
    case "tools/call"   -> { ... ToolOutcome outcome = executeTool(toolName, arguments, studentCode); ... }
    default             -> rpcResponse.put("error", jsonRpcError(METHOD_NOT_FOUND, ...));
}
```

Detalles de ingeniería defendibles:

- **Identidad blindada por sesión**: el handshake SSE (`/mcp/sse`) resuelve el estudiante una
  vez y lo fija inmutable en `McpSession`; los mensajes posteriores heredan esa identidad.
- **Gestión de memoria del dyno**: `ConcurrentHashMap<String, McpSession>` con
  timeout de sesión (30 min) y **evicción de la sesión más antigua** al superar 50 sesiones
  simultáneas — pensado para una demo prolongada.
- `tools/list` se construye **a partir del mismo Registry** del orquestador (traduciendo el
  esquema OpenAI a `inputSchema` MCP): una sola verdad, cero divergencia.
- Modo demostración: si no hay token UTP, la identidad se respalda contra el registro
  persistido en MySQL; si tampoco existe → 401 limpio. Nunca datos falsos.

---

## 4. Selección de modelo y failover (`infraestructure/external/OpenRouterModelSelector.java`, ~340 líns)

Componente complementario: escanea **en vivo** el catálogo público de OpenRouter
(`GET /api/v1/models`), rankea modelos **libres** por latencia empírica (TTFT) y tamaño de
parámetros activos (MoE), descarta modelos caídos (403/429) y expone candidatos
(`nemotron lightning / super / nano`). Cero modelos pagos hardcodeados y cero claves en código.

En el orquestador, el modelo efectivo se resuelve con prioridad:
`modelo pedido por el cliente → app.openrouter.model (YAML/env) → por defecto gratuito`,
y esa decisión **se registra y se envía al navegador** (observabilidad barata).

---

## 5. Frontend de mi módulo (Angular)

| Archivo | Líneas | Rol |
|---|---|---|
| `features/ai-assistant/ai-assistant-modal.component.ts` | ~540 | Modal del copiloto: arma el mensaje asistente con el stream, reemplazo por fallback HTTP si SSE falla, cuota client-side, historial |
| `features/ai-assistant/chat-message-bubble.component.ts` | ~240 | Burbuja: badges de herramientas ejecutadas + burbujas de actividad ("consultando sílabo…") |
| `features/ai-assistant/markdown-renderer.component.ts` | — | Render seguro del Markdown de la respuesta |
| `features/ai-assistant/matrix-orb.component.ts` | — | Orb animado (identidad visual del copiloto) |
| `data/services/ai-assistant.service.ts` | ~240 | Parser del stream SSE + `sendMessage` estándar |

El parser lee líneas `event:`/`data:` y despacha por tipo:

```ts
if (currentEvent === 'model')      { console.log('[AiChat] 🤖 Modelo que respondió:', ...); }
else if (currentEvent === 'activity') { ... burbujas y estados ... }
else if (currentEvent === 'tool')  { ... badges ... }
else if (currentEvent === 'delta') { ... content += token ... }
else if (data.trim() === '[DONE]') { return; }
```

(burbujas de actividad y badges son la **evidencia visual** para la demo de que el agente
*ejecutó* una herramienta y no respondió de memoria.)

```ts
const TOOL_MAP: Record<string, ToolBadge> = {
  get_today_schedule:       { label: 'Horario',      icon: 'calendar' },
  get_syllabus_details:     { label: 'Sílabo',       icon: 'book'     },
  get_enrolled_courses:     { label: 'Cursos',       icon: 'list'     },
  get_upcoming_evaluations: { label: 'Evaluaciones', icon: 'check'    },
};
```

La cuota client-side (`data/rate-limit/daily-limiter.ts`) eleva `incrementClientDailyUsage`
después de cada respuesta — espejo de la cuota del backend.

---

## 6. Flujo de punta a punta (para narrar en vivo)

Pregunta: **"¿Qué temas tocan esta semana en Desarrollo Web?"** (semana 11)

1. Angular abre `POST /api/v1/ai/chat/stream` con mensaje, token e historial (máx 8).
2. `AiChatController` resuelve identidad + registra token → emite `event: model`.
3. Orquestador arma `messages`: system prompt (+ ancla: "semana 11 de 18",
   contexto Lima/período) + historial + la pregunta; payload con las 4 tools y `tool_choice:auto`.
4. Llamada a OpenRouter con **failover de claves**.
5. El stream indica `finish_reason:"tool_calls"` con `get_today_schedule({})`
   (frontend recibe `event: activity` "consultando horario…"); se ejecuta la tool
   y su JSON entra al historial con `role:"tool"`.
6. Iteración 2: el modelo pide `get_syllabus_details({course_query:"desarrollo web", week:11})`;
   la tool resuelve nombre→código desde matriculados, consulta MySQL, filtra por semana.
7. Iteración 3: con esos datos reales, el modelo redacta la síntesis → `delta` token a token
   hasta `[DONE]`. Si el proveedor narró la llamada como texto, `rescueToolCalls` la detecta,
   la valida contra el registro y la ejecuta igual (el flujo no se detiene).
8. Frontend muestra badges (Horario/Sílabo) + burbujas de actividad y la respuesta con formato.

Todo ocurre en segundos, con máx 5 iteraciones y 6 consultas por alumno por día.

---

## 7. Decisiones que debo poder defender (resumen oral)

| Decisión | Por qué | Riesgo que cierra |
|---|---|---|
| ReAct iterativo (`MAX_ITERATIONS = 5`) | Respuesta real de datos, no plantillas | Bucle infinito del agente |
| Contrato único de tools (`AcademicToolRegistry`) | Orquestador y MCP exponen exactamente lo mismo | Dos listas de tools que divergen |
| Validar `name` contra el registro antes de ejecutar | Solo corren tools publicadas | Inyección de llamada inventada por el LLM |
| Rescate texto→tool_calls | Proveedores gratuitos que no materializan `tool_calls` nativo | "Plan narrado" como respuesta final |
| `week` como parámetro opcional con acota 1–18 | Consulta semanal barata; inválido = sílabo completo | Errores duros ante argumentos basura |
| Ancla temporal en el prompt | El LLM no sabe qué semana es hoy | Preguntas "de esta semana" sin contexto |
| Failover de claves + fallbackMessage | 429 de demostración nunca rompen la UI | Pantalla de error en la expo en vivo |
| MCP: siempre 200 con envelope JSON-RPC, nunca 500, nunca inventa | Contrato del protocolo y confianza del dato | 500s al Inspector / datos falsos |
| Cuota 6/día (dual backend+frontend) | Presupuesto de tokens finito para la demo | Quedarse sin llamadas por abuso |
| SSE con eventos tipados (`model/delta/activity/tool/done`) | UX streaming + observabilidad del modelo | Demo ciega sobre "quién respondió" |

---

## 8. Los otros módulos (resumen para contextualizar)

Repositorio con **DDD puro + CQRS** (4 capas) y frontend por features. La API externa de la UTP
(no es de este repo, ya desplegada) resuelve la parte difícil: login al portal UTP, horario
oficial y sílabos completos con sus 18 semanas.

| Módulo | ¿Quién? | Qué hace | Carpeta/interfaces |
|---|---|---|---|
| Login y perfil | Mod. 2 | Valida credenciales UTP, guarda carrera, campus y ciclo; "el portero" del sistema | `/auth`, `AuthController`, `SecurityIdentityResolver` |
| Horario semanal | Mod. 3 | Trae desde la API externa y persiste el horario real con semanas; lo muestra bonito | `/schedule`, `ScheduleController` |
| Sílabos | Mod. 4 | Descarga y normaliza sílabos con patrón **Cache-Aside** (MySQL espejo + API externa) | `/syllabus`, `SyllabusController` |
| Tareas | Mod. 5 | Sincronización de tareas con portales externos | `/tasks`, `TaskController` |
| Marketplace | Mod. 6 | Publicación de notas/ventana para alumnos | `/marketplace`, `MarketplaceController` |
| **Redes/Network** | otro | social del repo (networking, privacidad) | `features/networking`, `features/privacy` |

Mi módulo **consume** esos datos: el horario sirve para el ancla temporal del prompt, los
sílabos son la principal herramienta de consulta, y el horario persistido valida identidad en
el "modo demostración" del MCP.

### Estructura de carpetas

```
horario-inteligente-fullstack/
├─ backend-springboot/                       # Spring Boot (DDD + CQRS)
│  └─ src/main/java/com/utp/horario/
│     ├─ application/    # servicios, comandos, handlers, DTOs (mi módulo vive aquí)
│     │  └─ service/tool/    # AcademicToolService + AcademicToolRegistry
│     ├─ domain/         # agregados, repos (interfaces), value objects
│     ├─ infraestructure/  # adaptadores JPA, OpenRouter, pasarela UTP, seguridad
│     └─ interfaces/     # REST: AiChatController, McpServerController, etc.
├─ frontend-angular/                        # Angular standalone + signals
│  └─ src/app/
│     ├─ features/       # pantallas (ai-assistant, schedule, syllabus, auth...)
│     ├─ data/           # servicios HTTP, rate-limit, syllabus (cache client)
│     ├─ domain/         # modelos TS
│     └─ core/           # interceptores, utils
├─ docs/database/schema_mysql_workbench.sql  # DDL + seed
└─ DIVISION_TRABAJO_EQUIPO.md, INFORME_TECNICO_PROYECTO.md
```

---

## 9. Preguntas probables del jurado (respuestas cortas)

**¿Es un chatbot con respuestas preprogramadas?** No. Es un agente: el modelo decide qué
herramientas llamar y el backend ejecuta contra datos reales; el texto final se redacta con
esos resultados.

**¿Qué framework de agentes usaron?** Ninguno externo. Un bucle ReAct propio (máx 5 iteraciones, historial
con `role:"tool"`) sobre la API estándar OpenAI. Menos dependencias, control total del flujo.

**¿Cómo evita que la IA invente datos?** Tres capas: (1) JSON estrictos de tools y validación de
argumentos; (2) el backend **no** fabrica datos — si no hay registro devuelve un mensaje explícito;
(3) el prompt fija el contexto verificado ("no lo supongas"). Además el MCP declara "nunca se
sintetizan datos" como contrato.

**¿Cómo protege el presupuesto?** Cuota 6/día por alumno (dual), claves con rotación por 429 y
modelos `:free` por defecto.

**¿Por qué implementar MCP propio si ya hay chat?** Reparte alcance: consume mi módulo
**cualquier IA** (Claude Desktop, Inspector) sin tocar el frontend, con protocolo estándar
JSON-RPC 2.0 + SSE — valor arquitectónico y de industria.

**¿Qué pasa si OpenRouter se cae?** Rotación de claves; si todas fallan, `fallbackMessage`
devuelve un mensaje útil (no error) y la app sigue navegable.

**¿Y si el modelo "responde de memoria" sin llamar tools?** El prompt con ancla temporal y contexto
verificado, y el parseador del JSON válido dentro del cual recupera la invocación y la ejecuta; el
UI registra qué ocurrió en la consola del navegador.

---

## 10. Números para soltar durante la expo

- 4 herramientas académicas · 2 puertas de acceso (chat interno + MCP público)
- Máx **5** iteraciones ReAct · historial con **8** turnos · cuota **6/día** por alumno
- Failover sobre **5 claves** OpenRouter (rotación por 429/401/402/403)
- Protocolo MCP `2024-11-05` · sesiones SSE de **30 min** con límite de **50** simultáneas
- Ventana de sílabos: semanas **1–18** (América/Lima)
- Suite de pruebas del backend en verde (1 skip que exige MySQL real) + pruebas del rescate de
  tool-calls **sin llamadas reales a OpenRouter** (cero gasto de tokens en CI)
