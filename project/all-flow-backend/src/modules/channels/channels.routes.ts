/**
 * channels 모듈 — 채팅 채널/메시지 도메인 (BE-N6).
 *
 * 라우트:
 *   GET  /channels                          — caller가 멤버인 채널만 반환
 *   POST /channels/:channelId/messages      — 메시지 전송 (멤버십 RBAC)
 *
 * 현재 구현: in-memory 채널 시드(public + dm) + audit log (`channels.message`).
 * 메시지 페이징/조회 GET 은 본 단계에서 미포함 (FE는 send 만 사용).
 * 영속화/실시간 fan-out 은 follow-up.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ForbiddenError, ValidationError } from '../../shared/errors.js';

interface ChannelRow {
  id: string;
  name: string;
  kind: 'public' | 'private' | 'dm';
  members: string[];
}

const CHANNELS_SEED: ChannelRow[] = [
  { id: 'ch-general', name: '일반', kind: 'public', members: ['*'] },
  { id: 'ch-eng', name: 'engineering', kind: 'public', members: ['*'] },
  { id: 'ch-design', name: 'design', kind: 'private', members: ['u1', 'u2'] },
  { id: 'dm-u1-u2', name: '김민수 ↔ 이서연', kind: 'dm', members: ['u1', 'u2'] },
];

const MessageSend = z
  .object({
    text: z.string().min(1).max(4000),
  })
  .strict();

const visibleTo = (channel: ChannelRow, userId: string): boolean =>
  channel.members.includes('*') || channel.members.includes(userId);

export async function channelsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/channels', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    return CHANNELS_SEED.filter((c) => visibleTo(c, userId));
  });

  app.post(
    '/channels/:channelId/messages',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { channelId } = req.params as { channelId: string };
      const parsed = MessageSend.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

      const channel = CHANNELS_SEED.find((c) => c.id === channelId);
      if (!channel) throw new ValidationError(`존재하지 않는 채널: ${channelId}`);

      // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
      const userId = req.user!.id;
      if (!visibleTo(channel, userId)) {
        throw new ForbiddenError('채널 멤버가 아닙니다');
      }

      const message = {
        id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        channelId,
        authorId: userId,
        text: parsed.data.text,
        time: new Date().toISOString(),
      };

      app.log.info(
        {
          action: 'channels.message',
          actorId: userId,
          channelId,
          messageId: message.id,
        },
        'message sent',
      );

      return reply.code(201).send(message);
    },
  );
}
