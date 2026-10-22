/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      colors: {
        'accent-lime': '#bbf451',
        'surface-card': '#141417',
        'surface-card-hover': '#19191e',
      },
      /**
       * Escala de radios gobernada por tokens CSS.
       *
       * Cada utilidad resuelve contra el token correspondiente y, a la vez, se
       * acota proporcionalmente a la altura del propio elemento
       * (`min(token, --r-adaptive-cap)`). Un componente de poca altura conserva
       * un tramo recto y deja de leerse como pastilla, mientras que un
       * componente de altura generosa mantiene intacto el radio de diseño.
       *
       * Cambiar `--r-xl` en styles.src.css reconfigura de inmediato los cien
       * elementos que consumen esa escala.
       */
      borderRadius: {
        none: '0px',
        xs: 'var(--r-xs)',
        sm: 'var(--r-sm)',
        DEFAULT: 'var(--r-md)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        '2xl': 'var(--r-2xl)',
        '3xl': 'var(--r-3xl)',
        full: 'var(--r-pill)',
      },
    },
  },
  plugins: [],
}
