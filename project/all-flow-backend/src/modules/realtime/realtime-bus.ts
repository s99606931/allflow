/**
 * 이벤트 버스 — SSE/WebSocket 단일 소스.
 *
 * 책임:
 *  - `notification` / `activity` / `presence` / `chat` 4종 fan-out.
 *  - per-user 구독자 관리 (selective fan-out).
 *  - 글로벌 브로드캐스트 (모든 구독자에게 전송 — presence/activity 등).
 *  - 옵션: Redis Pub/Sub fan-out 어댑터 — 멀티노드 전파 (T-303).
 *
 * 설계:
 *  - `RealtimeBus` 는 in-process 구독자 dispatch 만 책임진다.
 *  - 멀티노드 fan-out 은 `attachRedisFanout()` 어댑터가 publish/subscribe 를 가로채
 *    Redis Pub/Sub 으로 위임한다 (인터페이스는 동일 유지).
 *
 * 본 모듈은 stateless route 와 분리하기 위해 별도 파일로 유지.
 */
import type { RealtimeEvent } from '../../shared/schemas/index.js';

export type RealtimeListener = (event: RealtimeEvent) => void;

export interface PublishOptions {
  /**
   * 특정 사용자에게만 전송 (notification 처럼 1:1 인 이벤트).
   * 없으면 글로벌 브로드캐스트.
   */
  userId?: string;
}

interface Subscription {
  userId: string;
  listener: RealtimeListener;
}

/**
 * 리모트 fan-out 훅. Redis Pub/Sub 등 외부 매체로 publish 를 위임할 때 사용.
 * 반환값이 true 면 본 노드에서는 다시 dispatch 하지 않고 외부 채널 에코를 기다린다(중복 방지).
 */
export type PublishHook = (event: RealtimeEvent, options: PublishOptions) => boolean | undefined;

/**
 * 단일 노드 in-memory 버스 + 옵션 외부 fan-out 훅.
 */
export class RealtimeBus {
  private readonly subs = new Set<Subscription>();
  private publishHook: PublishHook | null = null;

  subscribe(userId: string, listener: RealtimeListener): () => void {
    const sub: Subscription = { userId, listener };
    this.subs.add(sub);
    return () => {
      this.subs.delete(sub);
    };
  }

  /**
   * Redis Pub/Sub 등 외부 fan-out 훅을 등록한다.
   * 훅 등록 후 publish() 는 외부로 전송되고, 외부 채널이 deliverLocal() 로 다시 들어와 fan-out 된다.
   */
  setPublishHook(hook: PublishHook | null): void {
    this.publishHook = hook;
  }

  /**
   * 외부 채널로부터 받은 이벤트를 본 노드 구독자에게 직접 dispatch.
   * (Redis subscriber 가 메시지를 받으면 호출.)
   */
  deliverLocal(event: RealtimeEvent, options: PublishOptions = {}): number {
    let count = 0;
    for (const sub of this.subs) {
      if (options.userId && sub.userId !== options.userId) continue;
      sub.listener(event);
      count += 1;
    }
    return count;
  }

  publish(event: RealtimeEvent, options: PublishOptions = {}): number {
    if (this.publishHook) {
      const handled = this.publishHook(event, options);
      if (handled === true) return 0;
    }
    return this.deliverLocal(event, options);
  }

  /** 디버그/테스트 용. */
  size(): number {
    return this.subs.size;
  }
}

/**
 * 프로세스 전체에서 공유되는 싱글턴.
 * 라우트는 buildApp() 내에서 본 인스턴스를 사용.
 */
export const realtimeBus = new RealtimeBus();
