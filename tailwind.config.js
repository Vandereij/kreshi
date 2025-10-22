/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // New Palette from "Flow & Clarity"
        'primary-bg': '#F9F7F5', // Very Pale Greige
        'secondary-bg': '#FCFAFA', // Slightly Whiter Greige for cards
        'dark-text': '#333333',
        'body-text': '#5C5C5C',
        'dimmed-text': '#9E9E9E',
        'accent-teal': '#7CA1A4', // Primary Accent
        'light-teal': '#A0B7B9', // Secondary Accent
        'pale-teal': '#B8C9CC', // Highlight/Progress

        // Mood Gradient Colors (used in JS/SVG directly, but good to have a reference)
        'mood-awful': '#9EB2C7', // Muted Steel Blue
        'mood-bad': '#E6A89B',   // Soft Terracotta
        'mood-okay': '#C6D8D0',  // Pale Slate Green
        'mood-good': '#F0D680',  // Muted Butter Yellow
        'mood-great': '#FCDA9C', // Soft Goldenrod
      },
      // You might also define custom font families here
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'], // Example, replace with your chosen elegant font
      }
    },
  },
  plugins: [],
};