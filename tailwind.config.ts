import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          light: 'hsl(var(--primary-light))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        border: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      fontSize: {
        'elder-sm': ['clamp(0.98rem, 0.93rem + 0.25vw, 1.25rem)', { lineHeight: 'clamp(1.5rem, 1.45rem + 0.35vw, 1.9rem)' }],
        'elder-base': ['clamp(1.08rem, 1.01rem + 0.42vw, 1.375rem)', { lineHeight: 'clamp(1.72rem, 1.6rem + 0.55vw, 2.15rem)' }],
        'elder-lg': ['clamp(1.18rem, 1.06rem + 0.72vw, 1.625rem)', { lineHeight: 'clamp(1.85rem, 1.7rem + 0.72vw, 2.4rem)' }],
        'elder-xl': ['clamp(1.42rem, 1.22rem + 1.05vw, 2rem)', { lineHeight: 'clamp(2.05rem, 1.82rem + 1.25vw, 2.8rem)' }],
        'elder-2xl': ['clamp(1.78rem, 1.45rem + 1.72vw, 2.5rem)', { lineHeight: 'clamp(2.25rem, 1.95rem + 1.7vw, 3.2rem)' }],
        'elder-3xl': ['clamp(2.15rem, 1.7rem + 2.25vw, 3.25rem)', { lineHeight: 'clamp(2.6rem, 2.15rem + 2.05vw, 3.9rem)' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'typing': 'typing 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        typing: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
      },
      boxShadow: {
        'warm': '0 4px 20px -4px hsl(var(--primary) / 0.15)',
        'warm-lg': '0 10px 40px -10px hsl(var(--primary) / 0.2)',
        'card': '0 2px 12px -2px hsl(var(--foreground) / 0.08)',
      },
    },
  },
  plugins: [],
}

export default config
