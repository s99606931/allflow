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

const UpdateOrgUnit = z
  .object({
    name: z.string().min(1).max(80).optional(),
    parentId: z.string().min(1).max(80).nullable().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: '변경할 필드를 1개 이상 전달하세요' });

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

  app.patch('/org/units/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateOrgUnit.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const existing = await app.prisma.orgUnit.findUnique({ where: { id } });
    if (!existing) throw new ValidationError(`존재하지 않는 조직 단위: ${id}`);

    const { parentId, ...rest } = parsed.data;
    if (parentId !== undefined && parentId !== null) {
      const parent = await app.prisma.orgUnit.findUnique({ where: { id: parentId } });
      if (!parent) throw new ValidationError(`존재하지 않는 상위 조직 단위: ${parentId}`);
    }

    const updated = await app.prisma.orgUnit.update({
      where: { id },
      data: { ...rest, ...(parentId !== undefined ? { parentId } : {}) },
    });
    return updated;
  });

  app.delete('/org/units/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const existing = await app.prisma.orgUnit.findUnique({ where: { id } });
    if (!existing) throw new ValidationError(`존재하지 않는 조직 단위: ${id}`);

    const children = await app.prisma.orgUnit.count({ where: { parentId: id } });
    if (children > 0) throw new ValidationError('하위 부서가 있는 부서는 삭제할 수 없습니다. 먼저 하위 부서를 삭제하거나 이동하세요.');

    await app.prisma.orgUnit.delete({ where: { id } });
    return reply.code(204).send();
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
