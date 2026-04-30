/**
 * Prisma Client singleton + Fastify plugin.
 *
 * 책임:
 *  1) PrismaClient 인스턴스를 프로세스 단위로 1개만 유지 (HMR/테스트 친화)
 *  2) Fastify 플러그인으로 등록되면 `app.prisma` 데코레이터로 노출
 *  3) graceful shutdown 시 `$disconnect()` 호출
 *
 * 사용:
 *   import { prismaPlugin } from './plugins/prisma.js';
 *   await app.register(prismaPlugin);
 *   // app.prisma.user.findMany(...)
 */
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

let cached: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (cached) return cached;
  cached = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
  });
  return cached;
}

export async function disconnectPrisma(): Promise<void> {
  if (!cached) return;
  await cached.$disconnect();
  cached = null;
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

async function plugin(app: FastifyInstance): Promise<void> {
  const prisma = getPrisma();
  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => {
    await disconnectPrisma();
  });
}

export const prismaPlugin = fp(plugin, {
  name: 'prisma',
});
