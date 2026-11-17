# Reglas del Proyecto Horario Inteligente Fullstack

## 1. Diseño de Interfaz y UI/UX (Estándares Obligatorios)
- **CERO EMOJIS:** Prohibido rotundamente incluir emojis (🎯, 💻, ☕, ↩️, ❌, 🤖, ⚡, 💚, 📚, etc.) en componentes, botones, chips, textos o modales. Utilizar únicamente iconos SVG limpios (Lucide Icons o SVGs vectoriales inline).
- **CERO SOMBRAS NEÓN:** Prohibido usar sombras de colores saturados o fluorescentes (`shadow-[var(--accent-lime)]/20`, `shadow-red-500/10`, etc.). Solo se permiten sombras neutras discretas (`shadow-sm`, `shadow-md`, `shadow-black/20`, `shadow-none`) y bordes sobrios con tokens del sistema (`border border-[var(--border-subtle)]`).
- **VARIABLES GLOBALES:** Toda superficie, borde, color y radio debe consumir las variables CSS oficiales de `:root` (`--bg-main`, `--surface-card`, `--accent-lime`, `--r-lg`, `--r-xl`, `--r-2xl`, etc.).

## 2. Integridad de Datos (Zero Hardcoded Data)
- Prohibido hardcodear datos de alumnos, sedes, campus, carreras, cursos, secciones, docentes, notas o sílabos.
- Todo dato debe provenir dinámicamente de las llamadas institucionales (JWT claims, horarios, sílabos reales).

## 3. Arquitectura y Calidad de Código
- Enfoque modular (SRP), componentes pequeños y reutilizables.
- Responsive en mobile y desktop.
