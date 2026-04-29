/**
 * Tracing 플러그인 — W3C `traceparent` 컨텍스트 + Pino traceId 통합.
 *
 * 목표(T-502):
 *  - 들어오는 `traceparent` 헤더가 있으면 traceId/spanId 를 추출하여 req.log child 에 바인딩.
 *  - 없으면 새 traceId(16바이트 hex) + spanId(8바이트 hex) 생성.
 *  - 응답 `traceparent` 헤더로 송신 → 다운스트림에서 컨텍스트 propagation.
 *  - request id (req.id) 는 별도 보존 (사용자 추적용).
 *
 * 본 단계에서는 OpenTelemetry SDK 의존성을 추가하지 않고 W3C 표준만 구현한다.
 * 향후 collector 도입 시 본 traceId 가 그대로 OTLP exporter 로 흘러들어가도록 호환.
 */
import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

const TRACE_VERSION = '00';
const SAMPLED_FLAGS = '01';

declare module 'fastify' {
  interface FastifyRequest {
    traceContext: {
      traceId: string;
      spanId: string;
      traceparent: string;
    };
  }
}

interface ParsedTraceparent {
  traceId: string;
  spanId: string;
}

/**
 * W3C traceparent 형식: `version-traceId(32hex)-spanId(16hex)-flags(2hex)`.
 * 잘못된 형식은 null 반환 → 새로 생성.
 */
export function parseTraceparent(value: string | undefined): ParsedTraceparent | null {
  if (!value) return null;
  const parts = value.trim().split('-');
  if (parts.length !== 4) return null;
  const [version, traceId, spanId, flags] = parts;
  if (version !== TRACE_VERSION) return null;
  if (!traceId || traceId.length !== 32 || !/^[0-9a-f]+$/.test(traceId)) return null;
  if (!spanId || spanId.length !== 16 || !/^[0-9a-f]+$/.test(spanId)) return null;
  if (!flags || flags.length !== 2) return null;
  if (traceId === '0'.repeat(32) || spanId === '0'.repeat(16)) return null;
  return { traceId, spanId };
}

export function newTraceId(): string {
  return randomBytes(16).toString('hex');
}

export function newSpanId(): string {
  return randomBytes(8).toString('hex');
}

export function buildTraceparent(traceId: string, spanId: string): string {
  return `${TRACE_VERSION}-${traceId}-${spanId}-${SAMPLED_FLAGS}`;
}

async function plugin(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (req, reply) => {
    const incoming = req.headers.traceparent;
    const parsed = parseTraceparent(typeof incoming === 'string' ? incoming : undefined);
    const traceId = parsed?.traceId ?? newTraceId();
    // 새 span id — 본 요청을 다운스트림이 추적할 때 부모로 사용.
    const spanId = newSpanId();
    const traceparent = buildTraceparent(traceId, spanId);

    req.traceContext = { traceId, spanId, traceparent };

    // Pino child logger 에 traceId 바인딩 → 모든 후속 로그에 포함.
    req.log = req.log.child({ traceId, spanId, reqId: req.id });

    // 응답에 traceparent 송신.
    reply.header('traceparent', traceparent);
  });
}

export const tracingPlugin = fp(plugin, { name: 'tracing' });
