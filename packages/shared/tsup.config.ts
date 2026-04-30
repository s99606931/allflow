import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/errors/index.ts',
    'src/pagination/index.ts',
    'src/env/index.ts',
    'src/redact/index.ts',
    'src/zod/index.ts',
    'src/date/index.ts',
  ],
  outDir: 'dist',
  format: ['esm'],
  target: 'es2022',
  dts: true,
  clean: true,
  splitting: false,
  treeshake: true,
  sourcemap: false,
  external: ['zod'],
});
