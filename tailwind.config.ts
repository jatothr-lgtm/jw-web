import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Farmley navy, taken from the logo.
        navy: {
          50: "#f2f5fa",
          100: "#e3e9f3",
          200: "#c3d0e5",
          300: "#93aacf",
          400: "#5c7cb2",
          500: "#3a5b96",
          600: "#2a4677",
          700: "#22375d",
          800: "#1b2c4f",
          900: "#152340",
          950: "#0d162b",
        },
        // Warm amber for accents and highlights.
        amber: {
          50: "#fdf8ed",
          100: "#f9ecd0",
          200: "#f2d79c",
          300: "#eabd63",
          400: "#e3a53c",
          500: "#d98c24",
          600: "#bd6c1b",
          700: "#9c4f19",
          800: "#7f3f1b",
          900: "#693519",
        },
        cream: {
          50: "#fdfbf7",
          100: "#faf6ee",
          200: "#f4ecdd",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI",
          "Roboto", "Helvetica Neue", "Arial", "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(21, 35, 64, 0.04), 0 8px 24px -12px rgba(21, 35, 64, 0.12)",
        lift: "0 2px 4px rgba(21, 35, 64, 0.06), 0 16px 40px -16px rgba(21, 35, 64, 0.22)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
