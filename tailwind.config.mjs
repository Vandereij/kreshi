/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: { 50: "#F8F5F1", 100: "#F0ECE7", 200: "#E7E1DA", 300: "#D8D8D8" },
        ink: "#3A3A3A",
        sage: "#6B8E7D",
        lilac: "#8C6C82"
      },
      borderRadius: { '2xl': '1.25rem' },
      fontFamily: {
        montserrat: ['Montserrat', 'ui-sans-serif', 'system-ui'],
        inter: ['Inter', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
}
