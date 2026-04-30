import { ValidationError } from '@all-flow/shared/errors';
/**
 * docs 모듈 — 문서 도메인 (BE-N5).
 *
 * 라우트:
 *   GET  /docs   — 문서 목록 (updatedAt desc)
 *   POST /docs   — 문서 생성 (201)
 *
 * 현재 구현: in-memory store + audit log (`docs.create`).
 * preview 는 content 첫 200자 추출. 버전/Markdown 렌더는 follow-up.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

interface DocRow {
  id: string;
  title: string;
  ownerId: string;
  updatedAt: string;
  preview?: string;
}

const DocCreate = z
  .object({
    title: z.string().min(1).max(200),
    content: z.string().max(50000).optional(),
  })
  .strict();

const store = new Map<string, DocRow>();
let seq = 0;

export function __resetDocsForTests(): void {
  store.clear();
  seq = 0;
}

const newId = (): string => {
  seq += 1;
  return `doc-${seq.toString(36)}-${Date.now().toString(36)}`;
};

const PREVIEW_MAX = 200;

export async function docsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/docs', { preHandler: [app.authenticate] }, async () => {
    return Array.from(store.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  });

  app.post('/docs', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = DocCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const preview = parsed.data.content?.trim().slice(0, PREVIEW_MAX);
    const row: DocRow = {
      id: newId(),
      title: parsed.data.title,
      ownerId: userId,
      updatedAt: new Date().toISOString(),
      ...(preview ? { preview } : {}),
    };
    store.set(row.id, row);

    app.log.info(
      {
        action: 'docs.create',
        actorId: userId,
        docId: row.id,
        title: row.title,
      },
      'doc created',
    );

    return reply.code(201).send(row);
  });
}
