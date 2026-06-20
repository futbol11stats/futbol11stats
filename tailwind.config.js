/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          900: '#0a1628',
          800: '#0f2040',
          700: '#142952',
        },
        grass: {
          500: '#1a7a3c',
          400: '#22a050',
          300: '#2dc768',
        },
        amber: {
          500: '#f59e0b',
          400: '#fbbf24',
        },
        chalk: {
          100: '#f0f4f8',
          200: '#e2e8f0',
          600: '#718096',
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
