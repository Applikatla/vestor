import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f8fafc",
        surface: "#ffffff",
        subtle: "#f1f5f9",
        muted: "#64748b",
        "border-subtle": "#e2e8f0",
        "border-strong": "#cbd5e1",
        navy: {
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
        },
        brand: {
          DEFAULT: "#0f172a",
          accent: "#2563eb",
          hover: "#1d4ed8",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Inter"',
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          '"Geist Mono"',
          '"JetBrains Mono"',
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
