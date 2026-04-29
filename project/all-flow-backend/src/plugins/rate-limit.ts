/**
 * Rate-limit + 보안 헤더(helmet/cors lite) 플러그인.
 *
 * 책임:
 *  1) per-IP, per-user 토큰 버킷으로 요청 비율 제한
 *  2) 허용 한도 초과 시 429 + RateLimitError(통일 ErrorResponse 포맷)
 *  3) 응답에 RateLimit-* 헤더 + 기본 보안 헤더(helmet 핵심) + CORS 헤더 부착
 *
 * 외부 의존성을 추가하지 않고 fastify 기본 onRequest/onSend 훅으로 구현.
 * (T-503 통합테스트 단계에서 redis 기반 분산 rate-limit으로 교체 가능하도록 인터페이스 추상화)
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from '../shared/errors.js';

export interface RateLimitOptions {
  /** 시간 창 (ms). 기본 60_000 (1분). */
  windowMs?: number;
  /** 시간 창 당 익명(IP) 요청 한도. 기본 120. */
  ipMax?: number;
  /** 시간 창 당 인증 사용자(req.user.id) 요청 한도. 기본 600. */
  userMax?: number;
  /** 검사를 건너뛸 경로 prefix 목록. 기본 ['/health']. */
  skipPathPrefixes?: string[];
  /** CORS 허용 origin. '*' 또는 정확한 origin 리스트. 기본 '*'. */
  corsOrigins?: '*' | string[];
}

class RateLimitError extends AppError {
  constructor(retryAfterSec: number) {
    super({
      code: 'RATE_LIMITED',
      message: `요청이 너무 많습니다. ${retryAfterSec}초 후 다시 시도하세요.`,
      statusCode: 429,
      details: { retryAfterSec },
    });
    this.name = 'RateLimitError';
  }
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** 메모리 토큰 버킷 — 프로세스 단위. 분산 환경에서는 redis로 교체. */
export class MemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly windowMs: number) {}

  hit(
    key: string,
    max: number,
    now: number = Date.now(),
  ): { ok: boolean; remaining: number; resetAt: number } {
    const b = this.buckets.get(key);
    if (!b || b.resetAt <= now) {
      const fresh: Bucket = { count: 1, resetAt: now + this.windowMs };
      this.buckets.set(key, fresh);
      return { ok: true, remaining: max - 1, resetAt: fresh.resetAt };
    }
    if (b.count >= max) return { ok: false, remaining: 0, resetAt: b.resetAt };
    b.count += 1;
    return { ok: true, remaining: max - b.count, resetAt: b.resetAt };
  }

  /** 테스트 용 — 모든 버킷 초기화. */
  reset(): void {
    this.buckets.clear();
  }
}

const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Strict-Transport-Security', 'max-age=15552000; includeSubDomains'],
  ['X-DNS-Prefetch-Control', 'off'],
];

function shouldSkip(url: string, prefixes: string[]): boolean {
  return prefixes.some((p) => url === p || url.startsWith(`${p}/`) || url.startsWith(`${p}?`));
}

function applyCors(reply: FastifyReply, origins: '*' | string[], reqOrigin?: string): void {
  if (origins === '*') {
    reply.header('Access-Control-Allow-Origin', '*');
  } else if (reqOrigin && origins.includes(reqOrigin)) {
    reply.header('Access-Control-Allow-Origin', reqOrigin);
    reply.header('Vary', 'Origin');
  }
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'authorization, content-type, x-request-id');
  reply.header('Access-Control-Max-Age', '86400');
}

async function plugin(app: FastifyInstance, opts: RateLimitOptions): Promise<void> {
  const windowMs = opts.windowMs ?? 60_000;
  const ipMax = opts.ipMax ?? 120;
  const userMax = opts.userMax ?? 600;
  const skipPathPrefixes = opts.skipPathPrefixes ?? ['/health'];
  const corsOrigins = opts.corsOrigins ?? '*';

  const limiter = new MemoryRateLimiter(windowMs);
  app.decorate('rateLimiter', limiter);

  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    // CORS 프리플라이트는 즉시 204
    if (req.method === 'OPTIONS') {
      applyCors(reply, corsOrigins, req.headers.origin as string | undefined);
      reply.code(204).send();
      return;
    }

    if (shouldSkip(req.url, skipPathPrefixes)) return;

    const userId = req.user?.id;
    const key = userId ? `u:${userId}` : `ip:${req.ip}`;
    const max = userId ? userMax : ipMax;

    const r = limiter.hit(key, max);
    reply.header('RateLimit-Limit', String(max));
    reply.header('RateLimit-Remaining', String(Math.max(0, r.remaining)));
    reply.header('RateLimit-Reset', String(Math.ceil((r.resetAt - Date.now()) / 1000)));

    if (!r.ok) {
      const retryAfterSec = Math.max(1, Math.ceil((r.resetAt - Date.now()) / 1000));
      reply.header('Retry-After', String(retryAfterSec));
      throw new RateLimitError(retryAfterSec);
    }
  });

  app.addHook('onSend', async (req, reply, payload) => {
    for (const [k, v] of SECURITY_HEADERS) reply.header(k, v);
    applyCors(reply, corsOrigins, req.headers.origin as string | undefined);
    return payload;
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    rateLimiter: MemoryRateLimiter;
  }
}

export const rateLimitPlugin = fp(plugin, { name: 'rate-limit' });
