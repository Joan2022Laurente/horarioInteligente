const plugin = require('tailwindcss/plugin');

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
      borderRadius: {
        none: '0px',
        // Roles semánticos oficiales (Arquitectura de 3 capas)
        'control-xs': 'var(--r-control-xs)',
        'control-sm': 'var(--r-control-sm)',
        'control-md': 'var(--r-control-md)',
        'control-lg': 'var(--r-control-lg)',
        panel: 'var(--r-panel)',
        card: 'var(--r-card)',
        overlay: 'var(--r-overlay)',
        circle: 'var(--r-circle)',

        // Tokens legacy para retrocompatibilidad segura
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
  plugins: [
    plugin(({ matchUtilities, addUtilities, theme }) => {
      // r-<rol>: publica el radio como --nest-r y aplica border-radius
      matchUtilities(
        { r: (v) => ({ '--nest-r': v, borderRadius: 'var(--nest-r)' }) },
        { values: theme('borderRadius') }
      );
      // nest-<pad>: publica el padding como --nest-pad y aplica padding
      matchUtilities(
        { nest: (v) => ({ padding: v, '--nest-pad': v }) },
        { values: theme('spacing') }
      );
      // r-inner: radio concéntrico matemático para elementos hijos directos
      addUtilities({
        '.r-inner': {
          borderRadius: 'max(0px, calc(var(--nest-r, 8px) - var(--nest-pad, 4px)))',
        },
        '.circle': {
          borderRadius: 'var(--r-circle, 9999px)',
        },
        '.r-circle': {
          borderRadius: 'var(--r-circle, 9999px)',
        },
      });
    }),
  ],
}
