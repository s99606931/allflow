import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/zod/index.ts', 'src/types/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'es2022',
  dts: true,
  clean: false,
  splitting: false,
  treeshake: true,
});
