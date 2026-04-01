export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
      },
      colors: {
        surface: "#0f172a",
        panel: "#111827",
        muted: "#94a3b8",
        border: "#1f2937",
      },
    },
  },
  plugins: [],
};