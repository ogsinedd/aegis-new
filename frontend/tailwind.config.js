/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        panel: '#2c2c2c',
        accent: '#2ecc71',
      },
    },
  },
  plugins: [],
} 
