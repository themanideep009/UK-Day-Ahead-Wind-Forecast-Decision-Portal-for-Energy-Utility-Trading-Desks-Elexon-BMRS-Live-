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
          bg: '#060911',
          surface: '#0b101d',
          surfaceElevated: '#10172a',
          surfaceHover: '#16223d',
          border: '#1b2742',
          borderLight: '#2a3a5f',
          accent: '#06b6d4',      // Electric Cyan
          accentGlow: 'rgba(6, 182, 212, 0.15)',
          forecast: '#f59e0b',    // Luminous Amber
          actual: '#10b981',      // Emerald Green
          risk: '#818cf8',        // Violet / Indigo
          riskFill: 'rgba(99, 102, 241, 0.12)',
          short: '#f43f5e',       // Rose Red (Short position / over-forecast penalty)
          long: '#3b82f6',        // Cobalt Blue (Long position / surplus)
          gold: '#fbbf24',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow 2.5s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(6, 182, 212, 0.5)' },
        }
      }
    },
  },
  plugins: [],
}
