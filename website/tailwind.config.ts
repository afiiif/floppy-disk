import type { Config } from "tailwindcss";
import { PluginAPI } from "tailwindcss/types/config";

const plugin = require("tailwindcss/plugin");

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./*.jsx",
  ],
  darkMode: "class",
  theme: {
    extend: {
      backgroundImage: {
        grid: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(148 163 184 / 0.2)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
      },
    },
  },
  plugins: [
    plugin(function ({ addComponents, theme }: PluginAPI) {
      addComponents({
        ".btn": {
          "@apply bg-blue-600 text-white px-6 py-2.5 rounded-md": "",
          fontWeight: "500",
        },
        ".btn:disabled": {
          "@apply opacity-60 cursor-not-allowed": "",
        },
        "[type=button].btn": {
          "@apply bg-blue-600": "",
        },
        ".btn:hover, .btn:focus": {
          "@apply bg-blue-700": "",
        },
        ".btn-sm": {
          "@apply px-3 py-0.5": "",
        },
        ".btn-secondary": {
          "@apply bg-white text-blue-600 dark:bg-[rgb(17,17,17)]": "",
          "@apply border border-blue-600 px-6 py-2.5": "",
          fontWeight: "500",
        },
        ".btn-secondary:hover, .btn-secondary:focus": {
          "@apply bg-blue-50 dark:bg-[#0f1528]": "",
        },
        ".border-soft": {
          "@apply border-gray-200 dark:border-gray-800": "",
        },
      });
    }),
  ],
};

export default config;
