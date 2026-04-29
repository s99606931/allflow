import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  sourcemap: true,
  dts: true,
  clean: true,
  splitting: false,
  shims: false,
  minify: false,
  treeshake: true,
  tsconfig: './tsconfig.json',
  external: ['@prisma/client', 'fastify', 'pino', 'ioredis', 'socket.io', 'bullmq', 'zod'],
});
