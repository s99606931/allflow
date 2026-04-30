import { ValidationError } from '@all-flow/shared/errors';
/**
 * clients 모듈 — CRM 고객 도메인 (BE-N2).
 *
 * 라우트:
 *   GET  /clients   — 고객 목록
 *   POST /clients   — 고객 생성
 *
 * 현재 구현: in-memory store + audit log (`clients.create`).
 * 영속화는 follow-up (Prisma Client 모델). ownerId 는 생성자(req.user.id)로 자동 세팅.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

interface ClientRow {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  industry?: string;
  ownerId?: string;
  createdAt: string;
}

const ClientCreate = z
  .object({
    name: z.string().min(1).max(200),
    contact: z.string().min(1).max(120).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(1).max(40).optional(),
    industry: z.string().min(1).max(80).optional(),
  })
  .strict();

const store = new Map<string, ClientRow>();
let seq = 0;

export function __resetClientsForTests(): void {
  store.clear();
  seq = 0;
}

const newId = (): string => {
  seq += 1;
  return `cli-${seq.toString(36)}-${Date.now().toString(36)}`;
};

export async function clientsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/clients', { preHandler: [app.authenticate] }, async () => {
    return Array.from(store.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  app.post('/clients', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = ClientCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const row: ClientRow = {
      id: newId(),
      name: parsed.data.name,
      ...(parsed.data.contact ? { contact: parsed.data.contact } : {}),
      ...(parsed.data.email ? { email: parsed.data.email } : {}),
      ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.industry ? { industry: parsed.data.industry } : {}),
      ownerId: userId,
      createdAt: new Date().toISOString(),
    };
    store.set(row.id, row);

    app.log.info(
      {
        action: 'clients.create',
        actorId: userId,
        clientId: row.id,
        name: row.name,
      },
      'client created',
    );

    return reply.code(201).send(row);
  });
}
