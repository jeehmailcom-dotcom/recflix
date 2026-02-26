import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:        ["var(--font-dm-sans)", "var(--font-noto-sans-kr)", "sans-serif"],
        serif:       ["var(--font-noto-serif-kr)", "serif"],
        "dm-sans":   ["var(--font-dm-sans)", "sans-serif"],
        "noto-sans": ["var(--font-noto-sans-kr)", "sans-serif"],
        "noto-serif":["var(--font-noto-serif-kr)", "serif"],
      },
      colors: {
        // RecFlix brand colors
        primary: {
          50:  "#FDF4F0",
          100: "#FAE8DF",
          200: "#F5CEBC",
          300: "#EDAB8A",
          400: "#E38D6A",
          500: "#DA7756",
          600: "#C4623F",
          700: "#A84E2E",
          800: "#8A3D22",
          900: "#6E2F18",
        },
        secondary: {
          50:  "#f0efff",
          100: "#e2e0ff",
          200: "#c5c1ff",
          300: "#a8a2ff",
          400: "#8b83ff",
          500: "#6C63FF",
          600: "#5249e6",
          700: "#3d38cc",
          800: "#2d29a6",
          900: "#201d80",
        },
        dark: {
          100: "#1a1a1a",
          200: "#141414",
          300: "#0a0a0a",
        },
        background: "#FAFAF8",
        foreground: "#1A1A2E",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  safelist: [
    // HybridMovieCard TAG_COLORS — dynamic class strings not detected by JIT scanner
    "bg-primary-500", "bg-secondary-500", "bg-secondary-400",
    "bg-emerald-500", "bg-emerald-100", "text-emerald-700",
    "bg-yellow-500", "bg-orange-500", "bg-gray-400",
    // mood category color (emerald/green) — dynamic class strings
    "border-emerald-500", "shadow-emerald-500/30", "shadow-emerald-500/40",
  ],
  plugins: [],
};

export default config;
