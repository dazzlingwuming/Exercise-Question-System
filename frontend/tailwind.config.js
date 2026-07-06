/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201c",
        muted: "#66736c",
        line: "#dfe7e2",
        surface: "#f5f7f4",
        accent: "#0f8f72"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(22, 32, 28, 0.08)"
      }
    },
  },
  plugins: [],
};
