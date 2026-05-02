import { NotFoundError, ValidationError } from '@all-flow/shared/errors';
/**
 * clients 모듈 — CRM 고객 도메인 (T1: Prisma 영속화).
 *
 * 라우트:
 *   GET    /clients      — 고객 목록 (createdAt desc, soft-delete 제외)
 *   POST   /clients      — 고객 생성 (ownerId = req.user.id 자동 세팅)
 *   PATCH  /clients/:id  — 고객 부분 수정
 *   DELETE /clients/:id  — 고객 삭제 (soft-delete, 204)
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const ClientCreate = z
  .object({
    name: z.string().min(1).max(200),
    contact: z.string().min(1).max(120).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(1).max(40).optional(),
    industry: z.string().min(1).max(80).optional(),
  })
  .strict();

const ClientPatch = z
  .object({
    name: z.string().min(1).max(200).optional(),
    contact: z.string().min(1).max(120).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(1).max(40).optional(),
    industry: z.string().min(1).max(80).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: '수정할 필드가 하나 이상 필요합니다' });

interface ClientRow {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  ownerId: string | null;
  createdAt: Date;
}

const serialize = (row: ClientRow) => ({
  id: row.id,
  name: row.name,
  ...(row.contact !== null ? { contact: row.contact } : {}),
  ...(row.email !== null ? { email: row.email } : {}),
  ...(row.phone !== null ? { phone: row.phone } : {}),
  ...(row.industry !== null ? { industry: row.industry } : {}),
  ...(row.ownerId !== null ? { ownerId: row.ownerId } : {}),
  createdAt: row.createdAt.toISOString(),
});

export async function clientsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/clients', { preHandler: [app.authenticate] }, async () => {
    const rows = await app.prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(serialize);
  });

  app.post('/clients', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = ClientCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const row = await app.prisma.client.create({
      data: {
        name: parsed.data.name,
        contact: parsed.data.contact ?? null,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        industry: parsed.data.industry ?? null,
        ownerId: userId,
      },
    });

    app.log.info(
      {
        action: 'clients.create',
        actorId: userId,
        clientId: row.id,
        name: row.name,
      },
      'client created',
    );

    return reply.code(201).send(serialize(row));
  });

  app.patch('/clients/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const parsed = ClientPatch.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const existing = await app.prisma.client.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError('Client', id);

    const row = await app.prisma.client.update({
      where: { id },
      data: parsed.data,
    });

    app.log.info({ action: 'clients.update', actorId: userId, clientId: id }, 'client updated');
    return serialize(row);
  });

  app.delete('/clients/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const existing = await app.prisma.client.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError('Client', id);

    await app.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    app.log.info({ action: 'clients.delete', actorId: userId, clientId: id }, 'client deleted');
    reply.code(204);
    return null;
  });
}
