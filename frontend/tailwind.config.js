export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f8f9ff",
        surface: "#ffffff",
        "surface-low": "#eff4ff",
        "surface-mid": "#e5eeff",
        "surface-high": "#dce9ff",
        primary: "#003f87",
        "primary-soft": "#d7e2ff",
        secondary: "#006e25",
        "secondary-soft": "#80f98b",
        warning: "#973d00",
        "warning-soft": "#ffdbcc",
        danger: "#ba1a1a",
        "danger-soft": "#ffdad6",
        ink: "#0b1c30",
        muted: "#424752",
        outline: "#c2c6d4"
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0, 63, 135, 0.08)"
      }
    }
  },
  plugins: []
};
