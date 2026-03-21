import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        clearcart: {
          "primary": "#007bff",
          "secondary": "#6c757d",
          "accent": "#17a2b8",
          "neutral": "#343a40",
          "base-100": "#ffffff",
          "base-200": "#f8f9fa",
          "base-300": "#dee2e6",
          "info": "#17a2b8",
          "success": "#28a745",
          "warning": "#ffc107",
          "error": "#dc3545",
          "--base-content": "#212529",
        },
      },
    ],
    darkTheme: "clearcart",
  },
}
export default config