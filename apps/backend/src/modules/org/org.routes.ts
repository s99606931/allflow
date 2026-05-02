import { ValidationError } from '@all-flow/shared/errors';
/**
 * org 모듈 — 조직 단위 + 구성원 초대 도메인 (BE-N7).
 *
 * 라우트:
 *   GET  /org/units          — 조직 단위 목록 (Prisma 영속)
 *   POST /org/units          — 새 조직 단위 추가
 *   POST /org/invitations    — 구성원 초대 (email + orgUnitId + role)
 *
 * Invitation 영속화: Prisma `invitations` 테이블.
 * OrgUnit 영속화: Prisma `org_units` 테이블 (초기 시드 포함 마이그레이션).
 * 멱등성: 동일 (email, orgUnitId) 재초대 시 기존 invitation id 반환 (200 OK).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const InviteUser = z
  .object({
    email: z.string().email(),
    orgUnitId: z.string().min(1).max(80),
    role: z.string().min(1).max(80),
  })
  .strict();

const CreateOrgUnit = z
  .object({
    id: z.string().min(1).max(80).optional(),
    name: z.string().min(1).max(80),
    parentId: z.string().min(1).max(80).nullable().optional(),
  })
  .strict();

export async function orgRoutes(app: FastifyInstance): Promise<void> {
  app.get('/org/units', { preHandler: [app.authenticate] }, async () => {
    return app.prisma.orgUnit.findMany({ orderBy: { name: 'asc' } });
  });

  app.post('/org/units', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = CreateOrgUnit.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const { name, parentId } = parsed.data;

    if (parentId) {
      const parent = await app.prisma.orgUnit.findUnique({ where: { id: parentId } });
      if (!parent) throw new ValidationError(`존재하지 않는 상위 조직 단위: ${parentId}`);
    }

    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9가-힣-]/g, '');
    const id = parsed.data.id ?? `org-${slug}-${Date.now()}`;

    const unit = await app.prisma.orgUnit.create({
      data: { id, name, parentId: parentId ?? null, members: [] },
    });
    return reply.code(201).send(unit);
  });

  app.post('/org/invitations', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = InviteUser.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const { email, orgUnitId, role } = parsed.data;
    const unit = await app.prisma.orgUnit.findUnique({ where: { id: orgUnitId } });
    if (!unit) throw new ValidationError(`존재하지 않는 조직 단위: ${orgUnitId}`);

    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const existing = await app.prisma.invitation.findFirst({
      where: { email, orgUnitId },
    });

    if (existing) {
      app.log.info(
        {
          action: 'org.invite',
          actorId: userId,
          invitationId: existing.id,
          email,
          orgUnitId,
          idempotent: true,
        },
        'invitation idempotent re-issue',
      );
      return reply.code(200).send({ id: existing.id, pending: existing.pending });
    }

    const row = await app.prisma.invitation.create({
      data: { email, orgUnitId, role, invitedBy: userId },
    });

    app.log.info(
      {
        action: 'org.invite',
        actorId: userId,
        invitationId: row.id,
        email,
        orgUnitId,
        role,
      },
      'invitation issued',
    );

    return reply.code(201).send({ id: row.id, pending: row.pending });
  });
}
