import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0a0f",
          raised: "#13131a",
          elevated: "#1a1a24",
          hover: "#22222e",
        },
        border: {
          DEFAULT: "#2a2a38",
          muted: "#1f1f2a",
        },
        accent: {
          DEFAULT: "#7c5cff",
          hover: "#9177ff",
          muted: "#3d2f80",
        },
        reliability: {
          high: "#22c55e",
          mid: "#eab308",
          low: "#ef4444",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
