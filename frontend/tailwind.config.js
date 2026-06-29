/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        fa: ['Vazirmatn', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1e3a5f',
          light: '#2d5a9e',
          dark: '#152b47',
        },
      },
    },
  },
  plugins: [],
}
