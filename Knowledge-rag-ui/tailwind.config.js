/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#10a37f', // ChatGPT Green
        'gray-750': '#202123', // Sidebar Dark
        'gray-700': '#343541', // Main Chat Dark
        'gray-600': '#444654', // Message Bubble Dark
      }
    },
  },
  plugins: [],
}
