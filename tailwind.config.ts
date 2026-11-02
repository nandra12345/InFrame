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
        theater: {
          dark: "#180D0E",
          surface: "#271416",
          elevated: "#381C1E",
          border: "#4F2629",
        },
        cinema: {
          red: "#B22722",
          ember: "#D1342E",
          gold: "#E5B869",
          cream: "#F5EBEC",
          popcorn: "#FAF0E4",
          muted: "#B39899",
        },
      },
      fontFamily: {
        display: ["var(--font-syne)", "var(--font-bebas)", "sans-serif"],
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      animation: {
        "shutter-flash": "flash 0.35s ease-out",
        "print-eject": "printEject 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-gold": "pulseGold 2s infinite ease-in-out",
        "marquee-slide": "marquee 20s linear infinite",
      },
      keyframes: {
        flash: {
          "0%": { opacity: "0" },
          "20%": { opacity: "0.95" },
          "100%": { opacity: "0" },
        },
        printEject: {
          "0%": { transform: "translateY(-100%) scale(0.92)", opacity: "0" },
          "40%": { transform: "translateY(-30%) scale(0.96)", opacity: "1" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(229, 184, 105, 0.2)" },
          "50%": { boxShadow: "0 0 30px rgba(229, 184, 105, 0.6)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

