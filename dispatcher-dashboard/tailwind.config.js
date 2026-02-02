/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#003580', // Finnish blue
          600: '#002d6b',
          700: '#002456',
          800: '#001c41',
          900: '#00142c',
        },
        accent: {
          DEFAULT: '#D4AF37', // Gold
          light: '#e6c65c',
          dark: '#b89530',
        },
      },
    },
  },
  plugins: [],
};
