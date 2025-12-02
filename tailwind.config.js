/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#D4AF37', // Gold
        secondary: '#C41E3A', // Red
        dark: {
          900: '#121212', // Black
          800: '#1E1E1E', // Dark Gray
          700: '#2D2D2D', // Charcoal
        }
      },
    },
  },
  plugins: [],
}
