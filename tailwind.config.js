/** @type {import('tailwindcss').Config} */
const tokens = require('./src/theme/tokens.json');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './src/styles/**/*.css'],
  theme: {
    extend: {
      colors: {
        dark: 'rgb(var(--color-bg) / <alpha-value>)',
        light: 'rgb(var(--color-text) / <alpha-value>)',
        /** Legacy shell accent — see src/theme/tokens.json */
        accent: tokens.accentLegacy,
        brand: {
          orange: tokens.brand.orange,
          'orange-light': tokens.brand.orangeLight,
          'orange-muted': tokens.brand.orangeMuted,
        },
        'dark-card': 'rgb(var(--color-card) / <alpha-value>)',
        'dark-border': 'rgb(var(--color-border) / <alpha-value>)',
        'dark-hover': 'rgb(var(--color-hover) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
      },
      keyframes: {
        'wizard-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(53, 180, 211, 0.5)' },
          '50%': { boxShadow: '0 0 0 6px rgba(53, 180, 211, 0)' },
        },
      },
      animation: {
        'wizard-pulse': 'wizard-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('theme-light', '.theme-light &');
    },
  ],
}
