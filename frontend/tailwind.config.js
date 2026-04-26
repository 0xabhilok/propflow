/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#161a22',
          2: '#1e2330',
          3: '#252c3b',
        },
        brand: {
          blue: '#4f8ef7',
          teal: '#38d9a9',
        },
      },
    },
  },
  plugins: [],
};
