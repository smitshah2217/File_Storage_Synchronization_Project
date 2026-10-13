/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cloud: {
          50: '#F0F3FA',
          100: '#D5DEEF',
          200: '#B1C9EF',
          300: '#8AAEE0',
          400: '#638ECB',
          500: '#395886',
          600: '#2d466b',
          700: '#223552',
          800: '#172438',
          900: '#0d1520',
        },
        primary: {
          50: '#F0F3FA',
          100: '#D5DEEF',
          200: '#B1C9EF',
          300: '#8AAEE0',
          400: '#638ECB',
          500: '#395886',
          600: '#2d466b',
          700: '#223552',
          800: '#172438',
          900: '#0d1520',
        },
      },
    },
  },
  plugins: [],
}
