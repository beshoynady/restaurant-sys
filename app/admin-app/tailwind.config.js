/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",

        surface: "hsl(var(--surface))",
        "surface-secondary": "hsl(var(--surface-secondary))",

        foreground: "hsl(var(--foreground))",

        border: "hsl(var(--border))",

        primary: "hsl(var(--primary))",

        danger: "hsl(var(--danger))",
      },
    },
  },
  plugins: [],
};
