import { describe, expect, it } from 'vitest';
import type { RealtimeEvent } from '../../shared/schemas/index.js';
import { RealtimeBus } from './realtime-bus.js';

const NOTIFICATION_EVENT: RealtimeEvent = {
  type: 'notification',
  payload: {
    id: 'n1',
    kind: 'mention',
    title: 'You were mentioned',
    body: 'check this out',
    actor: 'u2',
    href: '/tasks/t1',
    time: new Date().toISOString(),
    read: false,
  },
};

const PRESENCE_EVENT: RealtimeEvent = {
  type: 'presence',
  payload: { userId: 'u1', online: true, lastSeen: new Date().toISOString() },
};

describe('modules/realtime/realtime-bus', () => {
  it('publish without userId → 모든 구독자에게 fan-out', () => {
    const bus = new RealtimeBus();
    const a: RealtimeEvent[] = [];
    const b: RealtimeEvent[] = [];
    bus.subscribe('u1', (e) => a.push(e));
    bus.subscribe('u2', (e) => b.push(e));
    const count = bus.publish(PRESENCE_EVENT);
    expect(count).toBe(2);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });

  it('publish with userId → 해당 사용자에게만 전달', () => {
    const bus = new RealtimeBus();
    const a: RealtimeEvent[] = [];
    const b: RealtimeEvent[] = [];
    bus.subscribe('u1', (e) => a.push(e));
    bus.subscribe('u2', (e) => b.push(e));
    const count = bus.publish(NOTIFICATION_EVENT, { userId: 'u2' });
    expect(count).toBe(1);
    expect(a).toHaveLength(0);
    expect(b).toHaveLength(1);
  });

  it('unsubscribe 후 더 이상 받지 않음', () => {
    const bus = new RealtimeBus();
    const a: RealtimeEvent[] = [];
    const off = bus.subscribe('u1', (e) => a.push(e));
    bus.publish(PRESENCE_EVENT);
    expect(a).toHaveLength(1);
    off();
    bus.publish(PRESENCE_EVENT);
    expect(a).toHaveLength(1);
    expect(bus.size()).toBe(0);
  });

  it('동일 사용자 다중 구독자 (멀티 디바이스)', () => {
    const bus = new RealtimeBus();
    const tab1: RealtimeEvent[] = [];
    const tab2: RealtimeEvent[] = [];
    bus.subscribe('u1', (e) => tab1.push(e));
    bus.subscribe('u1', (e) => tab2.push(e));
    const count = bus.publish(NOTIFICATION_EVENT, { userId: 'u1' });
    expect(count).toBe(2);
    expect(tab1).toHaveLength(1);
    expect(tab2).toHaveLength(1);
  });
});
