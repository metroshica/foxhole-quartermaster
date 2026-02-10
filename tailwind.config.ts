import type { Config } from "tailwindcss";

/**
 * Tailwind CSS configuration
 *
 * Uses CSS variables for theming (dark mode support via shadcn/ui)
 * The color system is designed for:
 * - Dark mode by default (Foxhole players often play at night)
 * - Status indicators: green (sufficient), yellow (partial), red (insufficient)
 * - Faction themes: Warden (blue), Colonial (green), Neutral (amber)
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // CSS variable-based colors for shadcn/ui theming
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          hover: "hsl(var(--card-hover))",
        },
        // Faction accent colors (dynamically themed)
        faction: {
          DEFAULT: "hsl(var(--faction-accent))",
          glow: "hsl(var(--faction-accent-glow))",
          muted: "hsl(var(--faction-accent-muted))",
        },
        // Supply status colors for gap analysis
        supply: {
          sufficient: "hsl(142, 76%, 36%)", // Green
          partial: "hsl(45, 93%, 47%)",     // Yellow/amber
          insufficient: "hsl(0, 84%, 60%)", // Red
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        // Enhanced shadow scale for depth
        "sm": "var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.4))",
        "md": "var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.5))",
        "lg": "var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.6))",
        "glow": "0 0 20px hsl(var(--faction-accent-glow) / 0.2)",
        "glow-sm": "0 0 10px hsl(var(--faction-accent-glow) / 0.15)",
      },
      transitionDuration: {
        "150": "150ms",
      },
      transitionTimingFunction: {
        "out": "ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
