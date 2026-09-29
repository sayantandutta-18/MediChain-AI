/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep navy / near-black base (PRD-7)
        ink: {
          950: '#04060c',
          900: '#070b14',
          850: '#0a1120',
          800: '#0f172a',
          700: '#16203a',
          600: '#1e2b4a',
        },
        // Cyan -> blue medical accent ramp
        signal: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        azure: {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
        },
        // Status accents as full scales so `/opacity` modifiers work everywhere.
        mint: {
          300: 'rgb(110 231 183)',
          400: 'rgb(52 211 153)',
          500: 'rgb(16 185 129)',
          600: 'rgb(5 150 105)',
        },
        amber: {
          300: 'rgb(252 211 77)',
          400: 'rgb(251 191 36)',
          500: 'rgb(245 158 11)',
          600: 'rgb(217 119 6)',
        },
        rose: {
          200: 'rgb(254 205 211)',
          300: 'rgb(252 165 165)',
          400: 'rgb(251 113 133)',
          500: 'rgb(244 63 94)',
          600: 'rgb(225 29 72)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(to bottom, rgba(34,211,238,0.07) 1px, transparent 1px), linear-gradient(to right, rgba(34,211,238,0.07) 1px, transparent 1px)',
        'radial-glow': 'radial-gradient(60% 60% at 50% 0%, rgba(34,211,238,0.18) 0%, transparent 70%)',
      },
      backgroundSize: { grid: '44px 44px' },
      boxShadow: {
        glass: '0 8px 32px rgba(2, 6, 23, 0.55)',
        'glow-cyan': '0 0 0 1px rgba(34,211,238,0.25), 0 12px 40px -12px rgba(34,211,238,0.45)',
        'glow-soft': '0 0 40px -12px rgba(59,130,246,0.35)',
      },
      backdropBlur: { xs: '2px' },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 1.8s infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
