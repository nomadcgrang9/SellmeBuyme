import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
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
    },
  },
  plugins: [],
};

export default config;
