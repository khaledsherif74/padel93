/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: 'rgb(var(--navy-rgb) / <alpha-value>)',
        night: 'rgb(var(--night-rgb) / <alpha-value>)',
        court: 'rgb(var(--court-rgb) / <alpha-value>)',
        edge: 'rgb(var(--edge-rgb) / <alpha-value>)',
        ball: 'rgb(var(--ball-rgb) / <alpha-value>)',
        white: 'rgb(var(--white-rgb) / <alpha-value>)',
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        tajawal: ['Tajawal', 'sans-serif'],
      },
      boxShadow: {
        card: '0 18px 50px rgba(0, 35, 70, 0.08)',
        'card-dark': '0 24px 60px rgba(0, 24, 62, 0.26)',
      },
    },
  },
  plugins: [],
};
