import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^floppy-disk$/, replacement: resolve('./src/index.ts') },
      { find: /^floppy-disk(.*)$/, replacement: resolve('./src/$1.ts') },
    ],
  },
  test: {
    name: 'floppy-disk',
    // Keeping globals to true triggers React Testing Library's auto cleanup
    // https://vitest.dev/guide/migration.html
    globals: true,
    environment: 'jsdom',
    dir: 'tests',
    reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions'] : ['default'],
    setupFiles: ['tests/_setup.ts'],
    coverage: {
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      reporter: ['text', 'json', 'html', 'text-summary'],
      reportsDirectory: './coverage/',
      provider: 'v8',
    },
  },
});
