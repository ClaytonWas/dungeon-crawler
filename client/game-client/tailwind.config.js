/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'blood': '#8B0000',
        'crimson': '#DC143C',
        'dark-purple': '#4C0B5F',
        'dark-gold': '#B8860B',
      },
      fontFamily: {
        'cinzel': ['Cinzel', 'serif'],
        'crimson': ['Crimson Text', 'serif'],
      },
    },
  },
  plugins: [],
}

