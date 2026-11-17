# Rule: Estándares Estrictos de Diseño UI/UX (Zero Emojis & Cero Efectos Neón)

## 1. Prohibición Absoluta de Emojis en la UI
Queda **ESTRICTAMENTE PROHIBIDO** el uso de emojis en cualquier parte de la interfaz de usuario:
- Prohibido en botones, etiquetas, tabs, chips, modales, placeholders, títulos o textos.
- Prohibido caracteres como 🎯, 💻, ☕, ↩️, ❌, 🤖, ⚡, 💚, 📚, 🏷️, 🕒, 📍, etc.
- **Única alternativa autorizada:** Iconos SVG limpios y sobrios provenientes de librerías oficiales (Lucide Icons o SVGs inline con trazo estándar de 1.5px / 2px, proporciones geométricas coherentes y colores semánticos monocromáticos o neutros).

## 2. Prohibición Absoluta de Sombras con Efecto Neón y Resplandores Chillones
Queda **ESTRICTAMENTE PROHIBIDO** aplicar efectos de resplandor, brillo o sombras con colores saturados tipo neón:
- Prohibidas clases como:
  - `shadow-[var(--accent-lime)]/20`
  - `shadow-[var(--accent-lime)]/30`
  - `shadow-red-500/...`
  - `shadow-emerald-500/...`
  - `drop-shadow-[...]` con colores fluorescentes.
- **Estándar de sombras:** Las sombras deben ser estrictamente neutras y sutiles:
  - `shadow-sm`, `shadow-md`, `shadow-black/20`, o preferir `shadow-none`.
  - La elevación y contraste visual se logran mediante **bordes sobrios** (`border border-[var(--border-subtle)]` o `border-[var(--border-medium)]`) y cambios sutiles de fondo superficial (`var(--surface-card)`, `var(--surface-subtle)`), nunca mediante auras de neón.

## 3. Filosofía de Diseño: Estilo Editorial & Minimalismo Sobrio (Vercel / Linear / Apple)
- Tipografía limpia con tracking ajustado (`Plus Jakarta Sans`).
- Contraste sobrio y maduro: fondo negro/ónix (`#0a0a0c`), superficies carbón y gris oscuro, bordes tenues al 8% - 16% de opacidad blanca.
- Acentos funcionales (Lima, Naranja, Azul) aplicados como toques de señalización e interactividad, nunca como halos fluorescentes.
