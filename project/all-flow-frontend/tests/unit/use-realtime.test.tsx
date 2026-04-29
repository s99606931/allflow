/**
 * TEST-F4 — useRealtime / realtime client unit tests.
 *
 * `src/lib/realtime.ts` 의 createClient() 동작을 격리 검증한다.
 * 본 테스트는 EventSource·WebSocket·setInterval 을 페이크로 주입하고
 * MODE 환경변수를 변경하기 위해 모듈 dynamic import 패턴을 사용한다.
 *
 * 커버:
 *  - mock 모드: connect → status 'open' → 5s tick 마다 dispatch
 *  - SSE 모드: onmessage → schema 검증 후 listener 호출, onerror → 재연결 예약
 *  - subscribe() 반환 값이 unsubscribe 동작
 *  - disconnect() 가 EventSource 를 닫고 status 'closed'
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type EvHandler = (e: { data: string }) => void;

class FakeEventSource {
  static last: FakeEventSource | null = null;
  static instanceCount = 0;
  url: string;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: EvHandler | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  constructor(url: string) {
    this.url = url;
    FakeEventSource.last = this;
    FakeEventSource.instanceCount += 1;
  }
  triggerOpen() {
    this.readyState = 1;
    this.onopen?.();
  }
  triggerMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  triggerError() {
    this.onerror?.();
  }
  close() {
    this.closed = true;
    this.readyState = 2;
  }
}

function resetGlobals() {
  FakeEventSource.last = null;
  FakeEventSource.instanceCount = 0;
  (globalThis as unknown as { EventSource: typeof FakeEventSource }).EventSource =
    FakeEventSource;
}

async function loadRealtime(mode: 'sse' | 'mock' | 'ws') {
  vi.resetModules();
  process.env.NEXT_PUBLIC_REALTIME_MODE = mode;
  process.env.NEXT_PUBLIC_SSE_URL = '/api/v1/sse';
  return import('@/lib/realtime');
}

describe('realtime client (TEST-F4)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetGlobals();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.NEXT_PUBLIC_REALTIME_MODE;
    delete process.env.NEXT_PUBLIC_SSE_URL;
  });

  it('SSE: onopen → status open → message dispatched to subscriber', async () => {
    const { realtime } = await loadRealtime('sse');
    const client = realtime();
    client.connect();

    expect(FakeEventSource.last).not.toBeNull();
    const fake = FakeEventSource.last!;
    fake.triggerOpen();
    expect(client.status()).toBe('open');

    const payloads: unknown[] = [];
    const off = client.subscribe('notification', (p) => payloads.push(p));

    fake.triggerMessage({
      type: 'notification',
      payload: {
        id: 'n1',
        kind: 'mention',
        title: '@me ping',
        time: '2026-04-29T10:00:00Z',
        read: false,
      },
    });

    expect(payloads).toHaveLength(1);
    expect((payloads[0] as { id: string }).id).toBe('n1');

    off();
    fake.triggerMessage({
      type: 'notification',
      payload: {
        id: 'n2',
        kind: 'mention',
        title: 'after-off',
        time: '2026-04-29T10:00:01Z',
        read: false,
      },
    });
    expect(payloads).toHaveLength(1);

    client.disconnect();
    expect(fake.closed).toBe(true);
    expect(client.status()).toBe('closed');
  });

  it('SSE: malformed message is ignored (no listener invoked)', async () => {
    const { realtime } = await loadRealtime('sse');
    const client = realtime();
    client.connect();
    const fake = FakeEventSource.last!;
    fake.triggerOpen();

    const seen: unknown[] = [];
    client.subscribe('notification', (p) => seen.push(p));

    // Schema 가 거부할 메시지.
    fake.triggerMessage({ type: 'notification', payload: { totally: 'invalid' } });
    expect(seen).toHaveLength(0);

    client.disconnect();
  });

  it('SSE: onerror schedules a reconnect (next EventSource instance created)', async () => {
    const { realtime } = await loadRealtime('sse');
    const client = realtime();
    client.connect();

    const first = FakeEventSource.last!;
    first.triggerOpen();
    expect(FakeEventSource.instanceCount).toBe(1);

    first.triggerError();
    expect(client.status()).toBe('closed');
    expect(first.closed).toBe(true);

    // 재연결 타이머 (3000ms) 진행.
    vi.advanceTimersByTime(3000);
    expect(FakeEventSource.instanceCount).toBe(2);

    const second = FakeEventSource.last!;
    second.triggerOpen();
    expect(client.status()).toBe('open');

    client.disconnect();
  });

  it('mock mode: dispatches a sample event every 5 s', async () => {
    const { realtime } = await loadRealtime('mock');
    const client = realtime();
    client.connect();
    expect(client.status()).toBe('open');

    const events: unknown[] = [];
    client.subscribe('notification', (p) => events.push(p));
    client.subscribe('activity', (p) => events.push(p));
    client.subscribe('presence', (p) => events.push(p));
    client.subscribe('chat', (p) => events.push(p));

    // 4개 sample 을 한 사이클(20s) 안에 모두 받는다.
    vi.advanceTimersByTime(5000);
    vi.advanceTimersByTime(5000);
    vi.advanceTimersByTime(5000);
    vi.advanceTimersByTime(5000);

    expect(events.length).toBeGreaterThanOrEqual(4);

    client.disconnect();
    expect(client.status()).toBe('closed');

    const before = events.length;
    vi.advanceTimersByTime(20_000);
    expect(events.length).toBe(before);
  });

  it('onStatus subscriber receives transitions and unsubscribes cleanly', async () => {
    const { realtime } = await loadRealtime('sse');
    const client = realtime();
    const seen: string[] = [];
    const off = client.onStatus((s) => seen.push(s));

    client.connect();
    const fake = FakeEventSource.last!;
    fake.triggerOpen();
    expect(seen).toContain('connecting');
    expect(seen).toContain('open');

    off();
    const before = seen.length;
    client.disconnect();
    expect(seen.length).toBe(before);
  });
});
