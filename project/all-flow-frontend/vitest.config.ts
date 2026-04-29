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
    // USE_MOCK 기본값 반전(2026-04-30) 후 단위 테스트는 fixture 모드 강제 — 실배선은 E2E 담당.
    env: { NEXT_PUBLIC_USE_MOCK: 'true' },
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
