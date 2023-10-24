/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-6deg)' },
          '50%': { transform: 'rotate(6deg)' },
        },
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'wiggle-once': 'wiggle 0.5s ease-in-out',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
