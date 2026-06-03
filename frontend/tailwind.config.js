import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#150f23",
        "ink": "#1f1633",
        "ink-press": "#1a1a1a",
        canvas: "#ffffff",
        "canvas-dark": "#1f1633",
        "surface-night": "#150f23",
        "soft-stone": "#f0f0f0",
        "surface-press-stronger": "#efefef",
        "accent-lime": "#c2ef4e",
        "accent-pink": "#fa7faa",
        "accent-violet": "#6a5fc1",
        "accent-violet-deep": "#422082",
        "accent-violet-mid": "#79628c",
        "hairline-violet": "#362d59",
        "hairline-cool": "#cfcfdb",
        "border-light": "#e5e7eb",
        "on-primary": "#ffffff",
        "on-dark-muted": "#bdb8c0",
        "on-dark-faint": "#3f3849",
        "ring-focus": "#9dc1f5",
        error: "#b30000",
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        xxl: "18px",
        full: "9999px",
      },
      fontFamily: {
        sans: ['Rubik', '-apple-system', 'system-ui', 'sans-serif'],
        display: ['"Sentry Display"', 'Rubik', 'system-ui', 'sans-serif'],
        mono: ['Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
      },
      backdropBlur: {
        xs: "2px",
      }
    },
  },
  plugins: [
    typography,
  ],
}
