/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      height: { screen: '100dvh' },
      minHeight: { screen: '100dvh' },
      maxHeight: { screen: '100dvh' },
      padding: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-left': 'env(safe-area-inset-left, 0px)',
        'safe-right': 'env(safe-area-inset-right, 0px)',
      },
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          soft: 'rgb(var(--brand-soft) / <alpha-value>)',
        },
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-muted': 'rgb(var(--surface-muted) / <alpha-value>)',
        ink: 'rgb(var(--text) / <alpha-value>)',
        'ink-muted': 'rgb(var(--text-muted) / <alpha-value>)',
        stroke: 'rgb(var(--border) / <alpha-value>)',
        success: '#10b981',
        danger: '#ef4444',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        pop: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '60%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideDown: {
          '0%': { maxHeight: '0', opacity: '0' },
          '100%': { maxHeight: '1200px', opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn .25s ease-out both',
        pop: 'pop .35s cubic-bezier(.2,.9,.3,1.2) both',
        slideDown: 'slideDown .3s ease-out both',
      },
    },
  },
  plugins: [],
};
