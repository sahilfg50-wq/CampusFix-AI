/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Colours come from CSS variables in src/index.css (light + automatic dark mode)
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        tx: 'var(--tx)',
        mu: 'var(--mu)',
        bd: 'var(--bd)',
        pr: 'var(--pr)',
        soft: 'var(--soft)',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
