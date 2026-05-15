import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0B10",
        surface: "#15151E",
        surface2: "#1D1D29",
        border: "#26263A",
        text: "#E8E8F0",
        muted: "#8A8AA0",
        ok: "#22C55E",
        staged: "#06B6D4",
        warn: "#F5C24A",
        bad: "#EF4444",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
