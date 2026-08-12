/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,tsx}",
    "./components/**/*.{js,ts,tsx}",
    "./constants/**/*.{js,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Light theme (default)
        primary: "#FF6B43",
        background: "#ffffff",
        backgroundSecondary: "#f8f8f8",
        backgroundCalendar: "#fafafa",
        pageBackground: "#FFF8F6",
        text: "#000000",
        textSecondary: "#666666",
        tint: "#FF6B43",
        tabIconDefault: "#cccccc",
        tabIconSelected: "#FF6B43",
        border: "#ebebeb",
        separator: "#eeeeee",
        success: "#14cc70",
        warning: "#ff9800",
        danger: "#ff4444",
        info: "#49bcd8",
        // Dark theme (use with dark: prefix, e.g. dark:bg-dark-background)
        dark: {
          primary: "#FF6B43",
          background: "#000000",
          backgroundSecondary: "#1a1a1a",
          backgroundCalendar: "#242424",
          pageBackground: "#0d0806",
          text: "#ffffff",
          textSecondary: "#a3a3a3",
          tint: "#ffffff",
          tabIconDefault: "#cccccc",
          tabIconSelected: "#ffffff",
          border: "rgba(255,255,255,0.1)",
          separator: "rgba(255,255,255,0.1)",
          success: "#14cc70",
          warning: "#ff9800",
          danger: "#ff4444",
          info: "#49bcd8",
        },
      },
      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.06)",
        "card-lg": "0 4px 16px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};
