import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { MemoryRateLimiter } from './rate-limit.js';

describe('plugins/rate-limit — MemoryRateLimiter', () => {
  it('limit 도달 시 차단, 시간 창 만료 후 다시 허용', () => {
    const limiter = new MemoryRateLimiter(1000);
    const t0 = 1_000_000;
    expect(limiter.hit('k', 2, t0).ok).toBe(true);
    expect(limiter.hit('k', 2, t0 + 10).ok).toBe(true);
    expect(limiter.hit('k', 2, t0 + 20).ok).toBe(false);
    // 창 만료 후 재허용
    expect(limiter.hit('k', 2, t0 + 1500).ok).toBe(true);
  });

  it('서로 다른 key는 격리', () => {
    const limiter = new MemoryRateLimiter(60_000);
    expect(limiter.hit('a', 1).ok).toBe(true);
    expect(limiter.hit('a', 1).ok).toBe(false);
    expect(limiter.hit('b', 1).ok).toBe(true);
  });
});

describe('plugins/rate-limit — Fastify integration', () => {
  it('한도 초과 시 429 + Retry-After + RateLimit-* 헤더', async () => {
    const app = await buildApp({ logger: false });
    // ipMax=2 로 격하
    app.rateLimiter.reset();
    // 라우트는 health 외 미등록 → 임시 라우트 추가
    app.get('/__test', async () => ({ ok: true }));

    // ipMax 기본값(120)으로는 초과를 만들기 어려움 → 직접 limiter에 한 키 채운다.
    const cap = 120;
    for (let i = 0; i < cap; i++) app.rateLimiter.hit('ip:127.0.0.1', cap);

    const r = await app.inject({ method: 'GET', url: '/__test' });
    expect(r.statusCode).toBe(429);
    expect(r.headers['retry-after']).toBeDefined();
    const body = r.json() as { error: { code: string } };
    expect(body.error.code).toBe('RATE_LIMITED');
    await app.close();
  });

  it('보안 헤더 + CORS 헤더 부착', async () => {
    const app = await buildApp({ logger: false });
    app.get('/__test2', async () => ({ ok: true }));
    const r = await app.inject({ method: 'GET', url: '/__test2' });
    expect(r.statusCode).toBe(200);
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-frame-options']).toBe('DENY');
    expect(r.headers['access-control-allow-origin']).toBe('*');
    expect(r.headers['ratelimit-limit']).toBeDefined();
    await app.close();
  });

  it('OPTIONS 프리플라이트 → 204 + CORS 헤더', async () => {
    const app = await buildApp({ logger: false });
    const r = await app.inject({
      method: 'OPTIONS',
      url: '/anything',
      headers: { origin: 'http://example.com' },
    });
    expect(r.statusCode).toBe(204);
    expect(r.headers['access-control-allow-methods']).toContain('GET');
    await app.close();
  });

  it('/health 는 rate-limit 면제 (skipPathPrefixes)', async () => {
    const app = await buildApp({ logger: false });
    // 가상으로 큰 hit 누적
    const cap = 120;
    for (let i = 0; i < cap; i++) app.rateLimiter.hit('ip:127.0.0.1', cap);
    const r = await app.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
    await app.close();
  });
});
