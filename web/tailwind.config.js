/* eslint-disable */
/** @type {import('tailwindcss').Config} */
const config = {
  // content: [
  //   "./src/component/**/*.{ts,tsx}",
  //   "./src/page/**/*.{ts,tsx}",
  //   "./src/route/**/*.{ts,tsx}",
  //   "./src/app.tsx",
  // ],
  darkMode: ["selector", '[data-mode="dark"]'],
  theme: {
    colors: {
      inherit: "inherit",
      current: "currentColor",
      transparent: "transparent",
      black: "#000",
      white: "#fff",
      "bg-primary": "hsl(var(--bg-primary))",
      "bg-secondary": "hsl(var(--bg-secondary))",
      "bg-tertiary": "hsl(var(--bg-tertiary))",
      "fg-primary": "hsl(var(--fg-primary))",
      "fg-secondary": "hsl(var(--fg-secondary))",
      "fg-tertiary": "hsl(var(--fg-tertiary))",
      ...["gray", "slate", "reimu", "marisa", "green", "blue"].reduce(
        (prev, color) => {
          prev[color] = Array.from({ length: 11 }).reduce((prev, _, index) => {
            const scale = (index + 1) * 100
            prev[scale] = `hsl(var(--${color}-${scale}))`
            return prev
          }, {})
          return prev
        },
        {},
      ),
    },
    extend: {
      backgroundColor: {
        primary: "hsl(var(--bg-primary))",
        secondary: "hsl(var(--bg-secondary))",
        tertiary: "hsl(var(--bg-tertiary))",
      },
      colors: {
        primary: "hsl(var(--fg-primary))",
        secondary: "hsl(var(--fg-secondary))",
        tertiary: "hsl(var(--fg-tertiary))",
      },
      aria: {
        invalid: `invalid="true"`,
      },
      gap: {
        128: "32rem",
        160: "40rem",
        192: "48rem",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        sans: [
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
        mono: [
          "Cascadia Code",
          "ui-monospace",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      ringColor: {
        DEFAULT: "hsl(var(--default-border-color))",
      },
      borderColor: {
        DEFAULT: "hsl(var(--default-border-color))",
      },
      borderWidth: {
        1.5: "1.5px",
      },
    },
  },
  future: {
    respectDefaultRingColorOpacity: true,
  },
  plugins: [require("@tailwindcss/forms")],
}

export default config
