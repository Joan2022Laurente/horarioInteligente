# Reglas del Proyecto Horario Inteligente Fullstack

## 1. Integridad Absoluta de Datos y CERO Fallbacks Silenciosos (MANDATORIO)
- **CERO FALLBACKS ENGAÑOSOS:** Prohibido rotundamente capturar errores de API (4xx, 5xx, timeout, red) para inyectar datos simulados en memoria, objetos `fallbackItem` o arrays ficticios.
- **FAIL FAST & HONEST SYSTEM:** Si el backend, Supabase o la red fallan, la aplicación debe fallar de forma visible y honesta: mostrar el error real, detener el flujo y permitir reintentar. Jamás simular éxito ni cerrar modales con datos falsos.
- **MUTACIONES ESTRICTAS:** Las acciones POST, PUT, PATCH y DELETE solo actualizan el estado del cliente si el servidor devuelve confirmación `200/201 OK` con la entidad real guardada en la base de datos.
- **ZERO HARDCODED DATA:** Prohibido hardcodear datos de alumnos, sedes, campus, carreras, cursos, secciones, docentes, notas o sílabos. Todo dato proviene de llamadas institucionales legítimas y bases de datos reales.
- **CERO OPERADORES OR CIEGOS:** Prohibido inventar métricas con `raw.rating || 5.0`, `raw.salesCount || 1` o badges que no vengan de la base de datos. Si no hay calificación o ventas, es `null` o `0`.

## 2. Diseño de Interfaz y UI/UX (Estándares Obligatorios)
- **CERO EMOJIS:** Prohibido incluir emojis (🎯, 💻, ☕, ↩️, ❌, 🤖, ⚡, 💚, 📚, etc.) en componentes, botones, chips, textos o modales. Utilizar únicamente iconos SVG limpios (Lucide Icons o SVGs vectoriales inline).
- **CERO SOMBRAS NEÓN:** Prohibido usar sombras de colores saturados o fluorescentes (`shadow-[var(--accent-lime)]/20`, `shadow-red-500/10`, etc.). Solo se permiten sombras neutras discretas (`shadow-sm`, `shadow-md`, `shadow-black/20`, `shadow-none`) y bordes sobrios con tokens del sistema (`border border-[var(--border-subtle)]`).
- **VARIABLES GLOBALES:** Toda superficie, borde, color y radio debe consumir las variables CSS oficiales de `:root` (`--bg-main`, `--surface-card`, `--accent-lime`, `--r-lg`, `--r-xl`, `--r-2xl`, etc.).
- **TEXTOS FIELES:** Prohibido incluir hashtags ficticios (`#UTP`, `#Emprendimiento`) o descripciones prefabricadas si el usuario no las escribió.

## 3. Arquitectura y Calidad de Código
- Enfoque modular (SRP), componentes pequeños y reutilizables.
- Código limpio y tipado estricto (cero `any` injustificado).
- Responsive en mobile y desktop.

## 4. Memoria Persistente (Engram MCP)
- **Fuente de Verdad Histórica:** Utilizar `engram` (`mem_search`, `mem_context`, `mem_get_observation`) para consultar decisiones previas, incidentes resueltos y restricciones arquitectónicas antes de modificar módulos críticos.
- **Persistencia Inmediata:** Guardar recuerdos (`mem_save`) al resolver un bug de arquitectura, negociar una regla operativa o descubrir una restricción externa con formato: `Título concreto`, `Causa raíz`, `Solución` y `topic_key` estable (ej. `security/sso-jwks-utp`, `architecture/no-silent-fallbacks`).
- **Cero Amnesia:** Prohibido asumir que algo "nunca se discutió" sin antes consultar la memoria persistente del proyecto.
