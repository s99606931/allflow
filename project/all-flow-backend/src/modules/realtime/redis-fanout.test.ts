/**
 * T-303 — Redis Pub/Sub fan-out 어댑터 단위 테스트.
 *
 * ioredis 를 인메모리로 모킹해 publish/subscribe 위임 동작을 검증한다.
 *
 * 검증 항목:
 *  - attach 시 publisher/subscriber 가 connect + subscribe(채널) 호출
 *  - bus.publish → publisher.publish 위임 (본 노드 직접 dispatch 안 함, hook 반환 true)
 *  - subscriber 메시지 수신 → bus.deliverLocal 호출
 *  - 다른 노드에서 들어온 userId 옵션도 보존
 *  - close 시 publisher/subscriber disconnect + hook 해제
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RealtimeEvent } from '../../shared/schemas/index.js';
import { RealtimeBus } from './realtime-bus.js';

type MessageHandler = (channel: string, message: string) => void;

class FakeRedis {
  static all: FakeRedis[] = [];
  connected = false;
  subscribed: string[] = [];
  published: Array<{ channel: string; message: string }> = [];
  disconnected = false;
  private handlers: MessageHandler[] = [];

  constructor(_url: string, _opts: unknown) {
    FakeRedis.all.push(this);
  }
  async connect(): Promise<void> {
    this.connected = true;
  }
  async subscribe(channel: string): Promise<void> {
    this.subscribed.push(channel);
  }
  async unsubscribe(_channel: string): Promise<void> {
    this.subscribed = [];
  }
  async publish(channel: string, message: string): Promise<number> {
    this.published.push({ channel, message });
    // 모든 fake instance 의 메시지 핸들러에게 분배 (멀티노드 시뮬레이션)
    for (const r of FakeRedis.all) {
      if (r === this) continue;
      for (const h of r.handlers) h(channel, message);
    }
    // 자기 자신도 echo (real Redis 와 동일)
    for (const h of this.handlers) h(channel, message);
    return 1;
  }
  on(event: string, handler: MessageHandler): this {
    if (event === 'message') this.handlers.push(handler);
    return this;
  }
  disconnect(): void {
    this.disconnected = true;
  }
}

vi.mock('ioredis', () => ({ Redis: FakeRedis }));

const SAMPLE: RealtimeEvent = {
  type: 'notification',
  payload: {
    id: 'n1',
    kind: 'mention',
    title: 'hi',
    time: new Date().toISOString(),
    read: false,
  },
};

describe('modules/realtime/redis-fanout', () => {
  beforeEach(() => {
    FakeRedis.all = [];
  });

  it('attach → publisher/subscriber connect + subscribe', async () => {
    const { attachRedisFanout } = await import('./redis-fanout.js');
    const bus = new RealtimeBus();
    const handle = await attachRedisFanout(bus, 'redis://x');
    expect(FakeRedis.all.length).toBe(2);
    expect(FakeRedis.all[0]?.connected).toBe(true);
    expect(FakeRedis.all[1]?.connected).toBe(true);
    expect(FakeRedis.all[1]?.subscribed).toContain('realtime:global');
    await handle.close();
  });

  it('bus.publish → redis publish 위임 + 본 노드 echo dispatch', async () => {
    const { attachRedisFanout } = await import('./redis-fanout.js');
    const bus = new RealtimeBus();
    const received: RealtimeEvent[] = [];
    bus.subscribe('u1', (e) => received.push(e));
    const handle = await attachRedisFanout(bus, 'redis://x');

    // Redis 두 개 중 publisher 가 첫 번째.
    const publisher = FakeRedis.all[0];
    expect(publisher).toBeDefined();

    bus.publish(SAMPLE, { userId: 'u1' });

    // publisher.publish 가 호출되었는가?
    expect(publisher?.published.length).toBe(1);
    const wire = JSON.parse(publisher?.published[0]?.message ?? '');
    expect(wire.userId).toBe('u1');
    expect(wire.event.type).toBe('notification');

    // subscriber echo → deliverLocal → 본 구독자 수신.
    expect(received.length).toBe(1);
    expect(received[0]?.type).toBe('notification');

    await handle.close();
  });

  it('멀티노드 — 다른 fake redis 가 publish → 본 노드 deliverLocal', async () => {
    const { attachRedisFanout } = await import('./redis-fanout.js');
    const busA = new RealtimeBus();
    const busB = new RealtimeBus();

    const recvA: RealtimeEvent[] = [];
    const recvB: RealtimeEvent[] = [];
    busA.subscribe('u1', (e) => recvA.push(e));
    busB.subscribe('u1', (e) => recvB.push(e));

    const handleA = await attachRedisFanout(busA, 'redis://x');
    const handleB = await attachRedisFanout(busB, 'redis://x');

    busA.publish(SAMPLE, { userId: 'u1' });

    expect(recvA.length).toBe(1);
    expect(recvB.length).toBe(1);

    await handleA.close();
    await handleB.close();
  });

  it('close → publisher/subscriber disconnect + hook 해제', async () => {
    const { attachRedisFanout } = await import('./redis-fanout.js');
    const bus = new RealtimeBus();
    const handle = await attachRedisFanout(bus, 'redis://x');
    const publisher = FakeRedis.all[0];
    const subscriber = FakeRedis.all[1];
    await handle.close();

    expect(publisher?.disconnected).toBe(true);
    expect(subscriber?.disconnected).toBe(true);

    // hook 해제 확인 — publish 직후 deliverLocal 만 작동
    const recv: RealtimeEvent[] = [];
    bus.subscribe('u1', (e) => recv.push(e));
    bus.publish(SAMPLE, { userId: 'u1' });
    expect(recv.length).toBe(1);
  });
});
