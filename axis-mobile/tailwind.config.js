module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        dark: '#080503',
        'dark-secondary': '#140E08',
        'dark-tertiary': '#221509',
        gold: {
          DEFAULT: '#B8863F',
          light: '#D4A261',
          dark: '#6B4420',
          bronze: '#8B5E28',
          highlight: '#E8C890',
          100: '#E8C890',
          300: '#D4A261',
          500: '#B8863F',
          700: '#8B5E28',
          900: '#6B4420',
        },
        cream: '#F2E0C8',
      },
    },
  },
  plugins: [],
};
