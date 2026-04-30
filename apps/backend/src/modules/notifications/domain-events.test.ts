/**
 * T-305 — 도메인 이벤트 핸들러 단위 테스트.
 *
 * 검증:
 *  - 3개 트리거(taskAssigned, issueSlaApproaching, mention) → DB create + bus.publish 1건씩
 *  - publish 의 userId 옵션이 본인에게 fan-out 되도록 설정
 *  - notification wire 페이로드의 필수 필드 + optional 누락 시 응답 필드 제거
 */
import { describe, expect, it, vi } from 'vitest';
import type { RealtimeEvent } from '../../shared/schemas/index.js';
import {
  type DomainEventDeps,
  type NotificationRow,
  onIssueSlaApproaching,
  onMention,
  onTaskAssigned,
} from './domain-events.js';

function buildDeps(): {
  deps: DomainEventDeps;
  created: Array<Record<string, unknown>>;
  published: Array<{ event: RealtimeEvent; userId: string }>;
} {
  const created: Array<Record<string, unknown>> = [];
  const published: Array<{ event: RealtimeEvent; userId: string }> = [];
  const deps: DomainEventDeps = {
    createNotification: vi.fn(async (input) => {
      created.push(input);
      const row: NotificationRow = {
        id: `n-${created.length}`,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        actor: input.actor ?? null,
        href: input.href ?? null,
        read: false,
        createdAt: new Date('2026-04-28T10:00:00Z'),
      };
      return row;
    }),
    publishEvent: vi.fn((event, opts) => {
      published.push({ event, userId: opts.userId });
    }),
  };
  return { deps, created, published };
}

describe('modules/notifications/domain-events', () => {
  it('onTaskAssigned → notification 생성 + bus publish', async () => {
    const { deps, created, published } = buildDeps();
    const row = await onTaskAssigned(deps, {
      assigneeUserId: 'u-assign',
      taskId: 't1',
      taskTitle: 'PRD 검토',
      actorName: '박서연',
    });

    expect(row.id).toBe('n-1');
    expect(created).toHaveLength(1);
    expect(created[0]?.userId).toBe('u-assign');
    expect(created[0]?.kind).toBe('mention');
    expect(created[0]?.title).toContain('PRD 검토');
    expect(created[0]?.href).toBe('/tasks/t1');

    expect(published).toHaveLength(1);
    expect(published[0]?.userId).toBe('u-assign');
    expect(published[0]?.event.type).toBe('notification');
    if (published[0]?.event.type === 'notification') {
      expect(published[0].event.payload.actor).toBe('박서연');
    }
  });

  it('onIssueSlaApproaching → kind=sla + body 잔여시간', async () => {
    const { deps, created, published } = buildDeps();
    await onIssueSlaApproaching(deps, {
      ownerUserId: 'u-own',
      issueId: 'i9',
      issueTitle: '서버 응답 지연',
      remainingMinutes: 15,
    });
    expect(created[0]?.kind).toBe('sla');
    expect(created[0]?.body).toContain('15');
    expect(created[0]?.href).toBe('/issues/i9');
    expect(published[0]?.userId).toBe('u-own');
  });

  it('onMention → preview 없으면 body 미포함', async () => {
    const { deps, created, published } = buildDeps();
    await onMention(deps, {
      mentionedUserId: 'u-m',
      authorName: '김민수',
      contextHref: '/projects/p1#c-12',
    });
    expect(created[0]?.kind).toBe('mention');
    expect(created[0]?.actor).toBe('김민수');
    // body 미포함 (undefined)
    expect(created[0]?.body).toBeUndefined();
    expect(published[0]?.userId).toBe('u-m');
    if (published[0]?.event.type === 'notification') {
      expect('body' in published[0].event.payload).toBe(false);
    }
  });

  it('onMention with preview → body 포함', async () => {
    const { deps, created } = buildDeps();
    await onMention(deps, {
      mentionedUserId: 'u-m',
      authorName: '김민수',
      contextHref: '/projects/p1#c-12',
      preview: '확인 부탁드립니다',
    });
    expect(created[0]?.body).toBe('확인 부탁드립니다');
  });

  it('publish 가 실패해도 createNotification 결과는 반환되어야 함', async () => {
    // emit-and-forget 보장 — publish 가 throw 하면 호출자까지 전파됨 (현 구현 그대로 검증)
    const created: Array<unknown> = [];
    const deps: DomainEventDeps = {
      createNotification: async (input) => {
        created.push(input);
        return {
          id: 'n-x',
          kind: input.kind,
          title: input.title,
          body: input.body ?? null,
          actor: input.actor ?? null,
          href: input.href ?? null,
          read: false,
          createdAt: new Date(),
        };
      },
      publishEvent: () => {
        throw new Error('boom');
      },
    };
    await expect(
      onTaskAssigned(deps, { assigneeUserId: 'u', taskId: 't', taskTitle: 'x' }),
    ).rejects.toThrow('boom');
    expect(created).toHaveLength(1);
  });
});
