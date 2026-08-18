/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#e0edff',
          500: '#1b63fb',
          600: '#1551d8',
          700: '#103ea8',
        },
        mandi: {
          green: '#10b981',
          gold: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        urdu: ['Noto Nastaliq Urdu', 'Gulzar', 'serif']
      }
    },
  },
  plugins: [],
}
