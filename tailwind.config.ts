import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7f4",
          100: "#d9ece3",
          500: "#2f8f6b",
          600: "#247356",
          700: "#1d5c45",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
