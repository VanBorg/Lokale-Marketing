/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: 'rgb(var(--color-bg) / <alpha-value>)',
        light: 'rgb(var(--color-text) / <alpha-value>)',
        accent: '#FF5C1A',
        'dark-card': 'rgb(var(--color-card) / <alpha-value>)',
        'dark-border': 'rgb(var(--color-border) / <alpha-value>)',
        'dark-hover': 'rgb(var(--color-hover) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
      },
      keyframes: {
        'wizard-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.5)' },
          '50%': { boxShadow: '0 0 0 6px rgba(245, 158, 11, 0)' },
        },
      },
      animation: {
        'wizard-pulse': 'wizard-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
