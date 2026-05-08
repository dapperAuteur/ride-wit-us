import type { Config } from "tailwindcss";

const config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Apron-level palette — used by season pages.
        apron: {
          green: "#4F7C2A",
          red: "#A8302A",
          purple: "#5E3A8C",
          black: "#1A1A1A",
          engineering: "#2D5C8F",
          community: "#D4892F",
        },
        // Per-design-prototype palettes. Tailwind needs to see these literal class
        // names somewhere or it purges them; they are referenced in the prototype
        // route files.
        workshop: {
          kraft: "#C8A977",
          ink: "#1A1A1A",
        },
        frame: {
          cream: "#F5F0E6",
          ink: "#0F0F10",
          orange: "#E25A1C",
          slate: "#5A6571",
        },
        chalk: {
          paper: "#F4ECD8",
          ink: "#221E1B",
          sun: "#F4B44A",
          ride: "#D33E2D",
          sky: "#5C8AA5",
          grass: "#3E7C3A",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia"],
        mono: ["var(--font-mono)", "ui-monospace", "Menlo"],
        display: ["var(--font-display)", "var(--font-serif)", "ui-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
