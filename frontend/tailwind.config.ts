import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        navy: "#06080f",
        ink: "#0b1220",
        mist: "#e8eefc",
        electric: "#3b82f6",
        violet: "#8b5cf6",
        mint: "#5eead4",
      },
      boxShadow: {
        card: "0 18px 50px -28px rgba(15, 23, 42, 0.7)",
        glow: "0 0 40px rgba(59, 130, 246, 0.16)",
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
