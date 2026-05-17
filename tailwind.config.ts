import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sustainability/compliance palette: deep forest + slate + signal colors
        canopy: {
          50: "#f1f7f3",
          100: "#dceae0",
          200: "#bbd6c4",
          300: "#8ebaa1",
          400: "#5e9a7c",
          500: "#3e7d60",
          600: "#2d634b",
          700: "#234f3d",
          800: "#1c3f32",
          900: "#16322a",
          950: "#0b1d18",
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d4d9e2",
          300: "#aeb6c5",
          400: "#828ea3",
          500: "#5f6a80",
          600: "#4a5366",
          700: "#3c4354",
          800: "#2e3442",
          900: "#1f2330",
          950: "#11141c",
        },
        risk: {
          low: "#2d8a55",
          monitor: "#c79621",
          investigate: "#d97742",
          escalate: "#b6354b",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Inter", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.04)",
        elevated: "0 8px 24px -10px rgba(15, 23, 42, 0.18), 0 2px 6px -2px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
