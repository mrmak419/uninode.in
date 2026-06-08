/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        ink:    '#0f0f0f',
        paper:  '#fafaf7',
        muted:  '#6b7280',
        accent: '#e85d2f',
        safe:   '#16a34a',
        warn:   '#ca8a04',
        miss:   '#dc2626',
        border: '#e5e3dd',
      },
    },
  },
  plugins: [],
}
