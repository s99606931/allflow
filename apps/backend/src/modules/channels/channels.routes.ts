import { ForbiddenError, NotFoundError, ValidationError } from '@all-flow/shared/errors';
/**
 * channels 모듈 — 채팅 채널/메시지 도메인 (T1: DB 영속화).
 *
 * 라우트:
 *   GET    /channels                                — caller가 멤버인 채널 반환
 *   GET    /channels/:channelId/messages            — 메시지 히스토리 (최신 50건)
 *   POST   /channels/:channelId/messages            — 메시지 전송
 *   PATCH  /channels/:channelId/messages/:msgId     — 메시지 수정 (작성자만)
 *   DELETE /channels/:channelId/messages/:msgId     — 메시지 삭제 (작성자만)
 *
 * 채널 영속화: DB가 비어 있으면 4개 기본 채널을 자동 시드.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const CHANNEL_SEED = [
  { name: '일반', kind: 'public' as const },
  { name: 'engineering', kind: 'public' as const },
  { name: 'design', kind: 'private' as const },
  { name: '김민수 ↔ 이서연', kind: 'dm' as const },
];

const MessageSend = z
  .object({
    text: z.string().min(1).max(4000),
  })
  .strict();

const MessagePatch = z
  .object({
    text: z.string().min(1).max(4000),
  })
  .strict();

async function ensureChannelsSeeded(app: FastifyInstance): Promise<void> {
  const count = await app.prisma.channel.count();
  if (count > 0) return;
  await app.prisma.channel.createMany({
    data: CHANNEL_SEED.map((c) => ({ name: c.name, kind: c.kind })),
  });
}

export async function channelsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/channels', { preHandler: [app.authenticate] }, async () => {
    await ensureChannelsSeeded(app);
    const rows = await app.prisma.channel.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((c) => ({ id: c.id, name: c.name, kind: c.kind, members: [] }));
  });

  app.get('/channels/:channelId/messages', { preHandler: [app.authenticate] }, async (req) => {
    const { channelId } = req.params as { channelId: string };
    const channel = await app.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new ValidationError(`존재하지 않는 채널: ${channelId}`);

    const messages = await app.prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: {
        author: { select: { id: true, name: true, initials: true, color: true } },
        replies: { select: { id: true } },
      },
    });

    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      channelId: m.channelId,
      authorId: m.authorId,
      parentId: m.parentId,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      author: m.author,
      replyCount: m.replies.length,
    }));
  });

  app.post(
    '/channels/:channelId/messages',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { channelId } = req.params as { channelId: string };
      const parsed = MessageSend.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

      const channel = await app.prisma.channel.findUnique({ where: { id: channelId } });
      if (!channel) throw new ValidationError(`존재하지 않는 채널: ${channelId}`);

      // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
      const userId = req.user!.id;

      if (channel.kind === 'dm') {
        throw new ForbiddenError('DM 채널은 현재 지원되지 않습니다');
      }

      const message = await app.prisma.message.create({
        data: { content: parsed.data.text, channelId, authorId: userId },
        include: {
          author: { select: { id: true, name: true, initials: true, color: true } },
        },
      });

      app.log.info(
        {
          action: 'channels.message',
          actorId: userId,
          channelId,
          messageId: message.id,
        },
        'message sent',
      );

      return reply.code(201).send({
        id: message.id,
        content: message.content,
        channelId: message.channelId,
        authorId: message.authorId,
        parentId: message.parentId,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        author: message.author,
        replyCount: 0,
      });
    },
  );

  app.patch(
    '/channels/:channelId/messages/:msgId',
    { preHandler: [app.authenticate] },
    async (req) => {
      const { channelId, msgId } = req.params as { channelId: string; msgId: string };
      const parsed = MessagePatch.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

      // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
      const userId = req.user!.id;

      const msg = await app.prisma.message.findFirst({ where: { id: msgId, channelId } });
      if (!msg) throw new NotFoundError('메시지를 찾을 수 없습니다');
      if (msg.authorId !== userId) throw new ForbiddenError('본인 메시지만 수정할 수 있습니다');

      const updated = await app.prisma.message.update({
        where: { id: msgId },
        data: { content: parsed.data.text },
        include: { author: { select: { id: true, name: true, initials: true, color: true } } },
      });

      return {
        id: updated.id,
        content: updated.content,
        channelId: updated.channelId,
        authorId: updated.authorId,
        parentId: updated.parentId,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        author: updated.author,
        replyCount: 0,
      };
    },
  );

  app.delete(
    '/channels/:channelId/messages/:msgId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { channelId, msgId } = req.params as { channelId: string; msgId: string };

      // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
      const userId = req.user!.id;

      const msg = await app.prisma.message.findFirst({ where: { id: msgId, channelId } });
      if (!msg) throw new NotFoundError('메시지를 찾을 수 없습니다');
      if (msg.authorId !== userId) throw new ForbiddenError('본인 메시지만 삭제할 수 있습니다');

      await app.prisma.message.delete({ where: { id: msgId } });

      return reply.code(204).send();
    },
  );
}
