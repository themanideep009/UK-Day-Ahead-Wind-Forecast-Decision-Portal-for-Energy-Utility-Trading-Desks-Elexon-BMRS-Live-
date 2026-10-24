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
        trading: {
          bg: '#090d16',
          card: '#0f172a',
          cardHover: '#131e35',
          border: '#1e293b',
          accent: '#06b6d4', // Cyan accent
          forecast: '#f59e0b', // Amber
          actual: '#10b981', // Emerald
          risk: '#818cf8', // Indigo/violet
          short: '#ef4444', // Red (short/over-forecast risk)
          long: '#3b82f6', // Blue (long/under-forecast)
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
