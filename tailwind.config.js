/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F26522',
          dark: '#D4561B',
          light: '#FFF3EE',
          50: '#FFF8F4',
          100: '#FFF3EE',
          200: '#FFDEC8',
          500: '#F26522',
          600: '#D4561B',
          700: '#B5481A',
        },
        dark: '#1A1A1A',
        'dark-soft': '#2D2D2D',
      },
      fontFamily: {
        heebo: ['Heebo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
