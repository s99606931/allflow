/**
 * T-305 — 도메인 이벤트 → notification 자동 생성.
 *
 * 책임:
 *  1) 도메인 트리거(태스크 어사인 / 이슈 SLA 임박 / 멘션) 발생 시
 *     a) DB Notification 레코드 생성
 *     b) realtimeBus 로 RealtimeEvent { type:'notification', payload } 발행
 *  2) 발행은 emit-and-forget — 도메인 트랜잭션 외부에서 비동기 처리.
 *
 * 의존성 주입:
 *  - `NotificationCreator` (DB) + `EventPublisher` (bus) 를 외부에서 주입해
 *    단위 테스트가 prisma/realtimeBus 를 모킹할 수 있도록 한다.
 *
 * 인터페이스만 안정적으로 유지하면 추후 outbox/큐(BullMQ) 백엔드로 교체 가능.
 */
import type { NotificationKind } from '@prisma/client';
import type { Notification, RealtimeEvent } from '../../shared/schemas/index.js';

export interface NotificationCreateInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  actor?: string;
  href?: string;
}

export interface NotificationRow {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  actor: string | null;
  href: string | null;
  read: boolean;
  createdAt: Date;
}

export type NotificationCreator = (input: NotificationCreateInput) => Promise<NotificationRow>;

export type EventPublisher = (event: RealtimeEvent, opts: { userId: string }) => void;

export interface DomainEventDeps {
  createNotification: NotificationCreator;
  publishEvent: EventPublisher;
}

function toWire(row: NotificationRow): Notification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    read: row.read,
    time: row.createdAt.toISOString(),
    ...(row.body ? { body: row.body } : {}),
    ...(row.actor ? { actor: row.actor } : {}),
    ...(row.href ? { href: row.href } : {}),
  };
}

async function emit(
  deps: DomainEventDeps,
  input: NotificationCreateInput,
): Promise<NotificationRow> {
  const row = await deps.createNotification(input);
  deps.publishEvent({ type: 'notification', payload: toWire(row) }, { userId: input.userId });
  return row;
}

export interface TaskAssignedEvent {
  assigneeUserId: string;
  taskId: string;
  taskTitle: string;
  actorName?: string;
}

export async function onTaskAssigned(
  deps: DomainEventDeps,
  ev: TaskAssignedEvent,
): Promise<NotificationRow> {
  return emit(deps, {
    userId: ev.assigneeUserId,
    kind: 'mention' as NotificationKind,
    title: `새 태스크 배정: ${ev.taskTitle}`,
    href: `/tasks/${ev.taskId}`,
    ...(ev.actorName ? { actor: ev.actorName } : {}),
  });
}

export interface IssueSlaApproachingEvent {
  ownerUserId: string;
  issueId: string;
  issueTitle: string;
  remainingMinutes: number;
}

export async function onIssueSlaApproaching(
  deps: DomainEventDeps,
  ev: IssueSlaApproachingEvent,
): Promise<NotificationRow> {
  return emit(deps, {
    userId: ev.ownerUserId,
    kind: 'sla' as NotificationKind,
    title: `SLA 임박: ${ev.issueTitle}`,
    body: `남은 시간 ${ev.remainingMinutes}분`,
    href: `/issues/${ev.issueId}`,
  });
}

export interface MentionEvent {
  mentionedUserId: string;
  authorName: string;
  contextHref: string;
  preview?: string;
}

export async function onMention(deps: DomainEventDeps, ev: MentionEvent): Promise<NotificationRow> {
  return emit(deps, {
    userId: ev.mentionedUserId,
    kind: 'mention' as NotificationKind,
    title: `${ev.authorName}님이 언급했습니다`,
    href: ev.contextHref,
    actor: ev.authorName,
    ...(ev.preview ? { body: ev.preview } : {}),
  });
}

/**
 * 기본 deps 헬퍼 — Fastify app 내에서 prisma + realtimeBus 를 묶어 주입.
 */
import type { PrismaClient } from '@prisma/client';
import type { RealtimeBus } from '../realtime/realtime-bus.js';

export function buildDomainEventDeps(prisma: PrismaClient, bus: RealtimeBus): DomainEventDeps {
  return {
    createNotification: async (input) => {
      const row = await prisma.notification.create({
        data: input,
      });
      return row as NotificationRow;
    },
    publishEvent: (event, opts) => {
      bus.publish(event, { userId: opts.userId });
    },
  };
}
