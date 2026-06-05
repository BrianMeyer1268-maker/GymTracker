import type { Config } from "tailwindcss";

// Iron Compass — dark, utility-first. Garmin / Notion / Stark feel: cool slate
// surfaces, a single cyan accent, muscle-group accents for wayfinding.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0e14",
        surface: "#121821",
        surface2: "#1a2230",
        surface3: "#232d3d",
        line: "#2a3442",
        ink: "#e7ecf3",
        muted: "#93a1b5",
        faint: "#5f6e82",
        accent: "#38bdf8",
        "accent-ink": "#04181f",
        good: "#34d399",
        hold: "#38bdf8",
        warn: "#fbbf24",
        bad: "#f87171",
        // movement-goal accents
        push: "#38bdf8",
        pull: "#a78bfa",
        legs: "#fb923c",
        hinge: "#34d399",
        full: "#818cf8",
        cond: "#f472b6",
        recovery: "#94a3b8",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      maxWidth: {
        app: "600px",
      },
      keyframes: {
        pop: {
          "0%": { opacity: "0", transform: "translate(-50%, 8px)" },
          "100%": { opacity: "1", transform: "translate(-50%, 0)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pop: "pop 0.2s ease",
        rise: "rise 0.22s ease",
      },
    },
  },
  plugins: [],
};

export default config;
