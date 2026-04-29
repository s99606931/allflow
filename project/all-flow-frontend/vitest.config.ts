/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.tsx'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**', 'src/components/ui/**', 'src/store/**'],
      exclude: ['**/*.stories.tsx', '**/*.gen.ts'],
    },
  },
});
