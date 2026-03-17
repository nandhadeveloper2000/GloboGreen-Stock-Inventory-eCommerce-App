module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#16BB05",
        primaryDark: "#0B7A22",
        primaryLight: "#E8FBE5",
        background: "#F8FAF8",
        card: "#FFFFFF",
        border: "#DDE6DD",
        heading: "#0F172A",
        textMain: "#111827",
        textSoft: "#6B7280",
        soft: "#F3F7F3",
        danger: "#EF4444",
      },
    },
  },
  plugins: [],
};