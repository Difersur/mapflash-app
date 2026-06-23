/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: { azul: '#1a8fe3', oscuro: '#0f1f35', claro: '#38bdf8' }
      }
    }
  },
  plugins: []
};
