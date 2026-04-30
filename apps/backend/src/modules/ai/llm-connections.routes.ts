/**
 * LLM Connections — admin-managed LLM endpoint registry.
 *
 * Scope:
 *   - GET    /llm-connections           list (admin)
 *   - POST   /llm-connections           create (admin)
 *   - PATCH  /llm-connections/:id       update (admin)
 *   - DELETE /llm-connections/:id       delete (admin, default-protected)
 *   - POST   /llm-connections/:id/activate  set as active default (admin)
 *   - POST   /llm-connections/:id/test  ping the endpoint (admin)
 *
 * Auth: requires authenticated user. Admin-only check is wired to next-auth
 * session role via `req.user.role === 'admin'` (org-level admin). When no
 * RBAC project context is available, falls back to user.role guard.
 *
 * Adapter resolution: see `db-backed-registry.ts` — handlers do not touch
 * the registry directly; cache invalidation happens on every write.
 */
import { ForbiddenError, NotFoundError, ValidationError } from '@all-flow/shared/errors';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DbBackedAIRegistry } from './db-backed-registry.js';
import { OpenAICompatAdapter } from './openai-compat-adapter.js';

const KIND = ['lmstudio', 'ollama', 'openai', 'anthropic', 'custom_openai_compat'] as const;

const CreateBody = z.object({
  name: z.string().min(1).max(80),
  kind: z.enum(KIND),
  baseUrl: z.string().url(),
  model: z.string().min(1).max(120),
  apiKey: z.string().max(500).nullable().optional(),
});

const UpdateBody = CreateBody.partial();

interface IdParam {
  id: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    requireAdmin?: () => void;
  }
}

function assertAdmin(role: string | undefined): void {
  if (role !== 'admin' && role !== 'owner') {
    throw new ForbiddenError('관리자 권한이 필요합니다');
  }
}

export interface LlmConnectionsRoutesOptions {
  registry: DbBackedAIRegistry;
}

export async function llmConnectionsRoutes(
  app: FastifyInstance,
  opts: LlmConnectionsRoutesOptions,
): Promise<void> {
  app.get('/llm-connections', { preHandler: [app.authenticate] }, async (req) => {
    assertAdmin(req.user?.role);
    const rows = await app.prisma.llmConnection.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map(serialize);
  });

  app.post('/llm-connections', { preHandler: [app.authenticate] }, async (req, reply) => {
    assertAdmin(req.user?.role);
    const parsed = CreateBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const created = await app.prisma.llmConnection.create({
      data: {
        name: parsed.data.name,
        kind: parsed.data.kind,
        baseUrl: parsed.data.baseUrl,
        model: parsed.data.model,
        apiKey: parsed.data.apiKey ?? null,
        isActive: false,
        isDefault: false,
      },
    });
    await opts.registry.invalidate();
    reply.code(201);
    return serialize(created);
  });

  app.patch('/llm-connections/:id', { preHandler: [app.authenticate] }, async (req) => {
    assertAdmin(req.user?.role);
    const { id } = req.params as IdParam;
    const parsed = UpdateBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const existing = await app.prisma.llmConnection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('LlmConnection');
    const updated = await app.prisma.llmConnection.update({
      where: { id },
      data: { ...parsed.data, apiKey: parsed.data.apiKey ?? existing.apiKey },
    });
    await opts.registry.invalidate();
    return serialize(updated);
  });

  app.delete('/llm-connections/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    assertAdmin(req.user?.role);
    const { id } = req.params as IdParam;
    const existing = await app.prisma.llmConnection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('LlmConnection');
    if (existing.isDefault) throw new ForbiddenError('기본 연결은 삭제할 수 없습니다');
    if (existing.isActive)
      throw new ForbiddenError('활성 연결은 삭제할 수 없습니다 (다른 연결을 먼저 활성화)');
    await app.prisma.llmConnection.delete({ where: { id } });
    await opts.registry.invalidate();
    reply.code(204);
    return null;
  });

  app.post('/llm-connections/:id/activate', { preHandler: [app.authenticate] }, async (req) => {
    assertAdmin(req.user?.role);
    const { id } = req.params as IdParam;
    const existing = await app.prisma.llmConnection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('LlmConnection');
    await app.prisma.$transaction([
      app.prisma.llmConnection.updateMany({ where: { isActive: true }, data: { isActive: false } }),
      app.prisma.llmConnection.update({ where: { id }, data: { isActive: true } }),
    ]);
    await opts.registry.invalidate();
    const refreshed = await app.prisma.llmConnection.findUniqueOrThrow({ where: { id } });
    return serialize(refreshed);
  });

  app.post('/llm-connections/:id/test', { preHandler: [app.authenticate] }, async (req) => {
    assertAdmin(req.user?.role);
    const { id } = req.params as IdParam;
    const existing = await app.prisma.llmConnection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('LlmConnection');
    const adapter = new OpenAICompatAdapter({
      name: `${existing.kind}:${existing.model}`,
      baseUrl: existing.baseUrl,
      model: existing.model,
      apiKey: existing.apiKey,
    });
    return await adapter.ping();
  });
}

interface DbRow {
  id: string;
  name: string;
  kind: string;
  baseUrl: string;
  model: string;
  apiKey: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function serialize(row: DbRow): {
  id: string;
  name: string;
  kind: string;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
} {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    baseUrl: row.baseUrl,
    model: row.model,
    hasApiKey: !!row.apiKey,
    isActive: row.isActive,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
