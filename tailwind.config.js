/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./cypress/support/utils/*.ts', './cypress/reports/**/*.html'],
  theme: {
    extend: {
      colors: {
        'test-passed': '#22c55e',
        'test-failed': '#ef4444',
        'test-skipped': '#f59e0b',
        'test-pending': '#6b7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
