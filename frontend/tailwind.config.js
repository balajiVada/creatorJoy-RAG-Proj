/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#17171c",
        "cohere-black": "#000000",
        ink: "#212121",
        "deep-green": "#003c33",
        "dark-navy": "#071829",
        canvas: "#ffffff",
        "soft-stone": "#eeece7",
        "pale-green": "#edfce9",
        "pale-blue": "#f1f5ff",
        hairline: "#d9d9dd",
        "border-light": "#e5e7eb",
        "card-border": "#f2f2f2",
        muted: "#93939f",
        slate: "#75758a",
        "body-muted": "#616161",
        "action-blue": "#1863dc",
        "focus-blue": "#4c6ee6",
        coral: "#ff7759",
        "coral-soft": "#ffad9b",
        "form-focus": "#9b60aa",
        "on-primary": "#ffffff",
        "on-dark": "#ffffff",
        error: "#b30000",
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "22px",
        xl: "30px",
        pill: "32px",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },
      backdropBlur: {
        xs: "2px",
      }
    },
  },
  plugins: [],
}
