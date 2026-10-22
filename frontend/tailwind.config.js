/** @type {import('tailwindcss').Config} */
// 主题令牌桥接：所有颜色都指向 CSS 变量，切换 data-theme 即可整站换肤。
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: token("ink"),
        muted: token("muted"),
        line: token("line"),
        surface: token("surface"),
        panel: { DEFAULT: token("panel"), 2: token("panel-2") },
        accent: {
          DEFAULT: token("accent"),
          2: token("accent-2"),
          soft: token("accent-soft"),
          border: token("accent-border"),
          muted: token("accent-muted"),
        },
        "on-accent": token("on-accent"),
        good: { DEFAULT: token("good"), soft: token("good-soft"), border: token("good-border") },
        warn: { DEFAULT: token("warn"), soft: token("warn-soft"), border: token("warn-border") },
        bad: { DEFAULT: token("bad"), soft: token("bad-soft"), border: token("bad-border") },
        gold: { DEFAULT: token("gold"), soft: token("gold-soft"), border: token("gold-border"), ink: token("gold-ink") },
        scrim: token("scrim"),
        sidebar: {
          DEFAULT: token("sidebar"),
          ink: token("sidebar-ink"),
          muted: token("sidebar-muted"),
          line: token("sidebar-line"),
          active: token("sidebar-active"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.75rem",
      },
      boxShadow: {
        soft: "var(--shadow-1)",
        lift: "var(--shadow-2)",
        glow: "var(--glow)",
        inset: "inset 0 1px 0 rgb(255 255 255 / 0.06)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-10px) rotate(-1.2deg)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(12px,-16px,0) scale(1.04)" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-180% 0" },
          "100%": { backgroundPosition: "180% 0" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.06)" },
        },
        wave: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        drift: "drift 14s ease-in-out infinite",
        rise: "rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 2.2s linear infinite",
        "pulse-glow": "pulseGlow 6s ease-in-out infinite",
        wave: "wave 18s linear infinite",
      },
    },
  },
  plugins: [],
};
