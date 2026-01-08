import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['esamanru', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#a8c5e0',
        talent: '#c5e3d8',
        experience: '#ffd98e',
        danger: '#DC2626',
      },
      maxWidth: {
        'container': '1400px',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'bounce-left': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-4px)' }
        }
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'bounce-left': 'bounce-left 1s ease-in-out infinite'
      },
      padding: {
        'safe': 'env(safe-area-inset-bottom)'
      }
    },
  },
  plugins: [],
};

export default config;
