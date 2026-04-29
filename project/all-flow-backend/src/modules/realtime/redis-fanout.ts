/**
 * T-303 — Redis Pub/Sub fan-out 어댑터.
 *
 * 멀티노드 환경에서 SSE/WS 양쪽이 동일 메시지를 받도록 RealtimeBus 의
 * publish 를 Redis 채널로 위임하고, 모든 노드는 같은 채널을 구독해 deliverLocal 로
 * fan-out 한다.
 *
 * 채널 전략:
 *   - 글로벌 채널 1개: `realtime:global`
 *   - 페이로드: { event, userId? } JSON 직렬화
 *   - 모든 노드는 자기 자신을 포함해 메시지를 수신 (발행자 본인도 echo 로 fan-out 받음)
 *     → 단일 publish 경로 보장 (중복 방지: deliverLocal 만 호출, publish 다시 하지 않음)
 *
 * 사용:
 *   const bus = realtimeBus;
 *   const handle = await attachRedisFanout(bus, REDIS_URL);
 *   // graceful shutdown 시 handle.close()
 */
import { Redis } from 'ioredis';
import type { RealtimeEvent } from '../../shared/schemas/index.js';
import type { PublishOptions, RealtimeBus } from './realtime-bus.js';

const CHANNEL = 'realtime:global';

interface WirePayload {
  event: RealtimeEvent;
  userId?: string;
}

export interface RedisFanoutHandle {
  close: () => Promise<void>;
}

/**
 * RealtimeBus 에 Redis Pub/Sub 훅을 부착한다.
 * 반환된 handle.close() 호출 시 Redis 연결을 정리하고 hook 을 해제한다.
 */
export async function attachRedisFanout(
  bus: RealtimeBus,
  redisUrl: string,
): Promise<RedisFanoutHandle> {
  const publisher = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const subscriber = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });

  await publisher.connect();
  await subscriber.connect();
  await subscriber.subscribe(CHANNEL);

  subscriber.on('message', (channel, message) => {
    if (channel !== CHANNEL) return;
    const parsed = parseWire(message);
    if (!parsed) return;
    const opts: PublishOptions = parsed.userId ? { userId: parsed.userId } : {};
    bus.deliverLocal(parsed.event, opts);
  });

  bus.setPublishHook((event, options) => {
    const wire: WirePayload = options.userId ? { event, userId: options.userId } : { event };
    // fire-and-forget. 발행 실패 시 ioredis 가 재연결 시도.
    void publisher.publish(CHANNEL, JSON.stringify(wire));
    // true 반환 → 본 노드는 직접 dispatch 하지 않고 subscriber echo 를 기다림.
    return true;
  });

  return {
    close: async () => {
      bus.setPublishHook(null);
      await subscriber.unsubscribe(CHANNEL).catch(() => undefined);
      subscriber.disconnect();
      publisher.disconnect();
    },
  };
}

function parseWire(raw: string): WirePayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<WirePayload>;
    if (!parsed || typeof parsed !== 'object' || !parsed.event) return null;
    return parsed as WirePayload;
  } catch {
    return null;
  }
}
