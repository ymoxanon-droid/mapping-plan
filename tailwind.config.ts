import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: { 50: "#f7f7f8", 900: "#0b0b10", 800: "#121218", 700: "#1a1a22" },
        accent: { DEFAULT: "#7c5cff", soft: "#2a1f66" },
        ok: "#22c55e",
        warn: "#eab308",
        late: "#ef4444",
        muted: "#6b7280"
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      }
    }
  },
  plugins: []
};
export default config;
