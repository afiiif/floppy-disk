import type { Config } from 'tailwindcss';
import { PluginAPI, PluginCreator } from 'tailwindcss/types/config';
const plugin = require('tailwindcss/plugin');

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [
    plugin(function ({ addComponents, theme }: PluginAPI) {
      addComponents({
        '.h1': {
          fontSize: '2rem',
          fontWeight: '800',
          marginBottom: '1.75rem',
        },
        '.h2': {
          fontSize: '1.5rem',
          fontWeight: '800',
          marginTop: '2.25rem',
          marginBottom: '1.25rem',
        },
        '.btn': {
          color: theme('colors.white'),
          backgroundColor: theme('colors.neutral.800'),
          borderRadius: theme('borderRadius.lg'),
          padding: '0.75rem 2rem',
          fontWeight: '500',
        },
      });
    }),
  ],
};
export default config;
