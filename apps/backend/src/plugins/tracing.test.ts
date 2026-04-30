import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { resetEnvForTests } from '../config/env.js';
import {
  buildTraceparent,
  newSpanId,
  newTraceId,
  parseTraceparent,
  tracingPlugin,
} from './tracing.js';

describe('plugins/tracing — parseTraceparent', () => {
  it('표준 형식 파싱', () => {
    const tp = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    const r = parseTraceparent(tp);
    expect(r).toEqual({
      traceId: '0af7651916cd43dd8448eb211c80319c',
      spanId: 'b7ad6b7169203331',
    });
  });

  it.each([
    ['undefined', undefined],
    ['빈 문자열', ''],
    ['파트 부족', '00-aaa'],
    ['잘못된 version', '99-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'],
    ['traceId 길이', '00-1234-b7ad6b7169203331-01'],
    ['spanId 길이', '00-0af7651916cd43dd8448eb211c80319c-1234-01'],
    ['traceId all-zero', '00-00000000000000000000000000000000-b7ad6b7169203331-01'],
    ['hex 아닌 문자', '00-zaf7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'],
  ])('잘못된 입력은 null: %s', (_label, input) => {
    expect(parseTraceparent(input as string | undefined)).toBeNull();
  });
});

describe('plugins/tracing — id 생성기', () => {
  it('newTraceId 32 hex chars', () => {
    const id = newTraceId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });
  it('newSpanId 16 hex chars', () => {
    const id = newSpanId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });
  it('buildTraceparent 형식', () => {
    const tp = buildTraceparent('a'.repeat(32), 'b'.repeat(16));
    expect(tp).toBe(`00-${'a'.repeat(32)}-${'b'.repeat(16)}-01`);
  });
});

describe('plugins/tracing — Fastify 통합', () => {
  it('수신 traceparent → 응답에 동일 traceId 포함', async () => {
    resetEnvForTests();
    const app = await buildApp({ logger: false });
    await app.register(tracingPlugin);
    app.get('/echo', async (req) => ({ tc: req.traceContext }));

    const incoming = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    const r = await app.inject({
      method: 'GET',
      url: '/echo',
      headers: { traceparent: incoming },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { tc: { traceId: string; spanId: string; traceparent: string } };
    expect(body.tc.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
    // 새 span id 가 발급되어야 함 (incoming spanId 와 다름)
    expect(body.tc.spanId).not.toBe('b7ad6b7169203331');
    expect(r.headers.traceparent).toBeDefined();
    expect(r.headers.traceparent).toContain('0af7651916cd43dd8448eb211c80319c');
    await app.close();
  });

  it('traceparent 없으면 새로 생성', async () => {
    resetEnvForTests();
    const app = await buildApp({ logger: false });
    await app.register(tracingPlugin);
    app.get('/echo', async (req) => ({ tc: req.traceContext }));

    const r = await app.inject({ method: 'GET', url: '/echo' });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { tc: { traceId: string } };
    expect(body.tc.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(r.headers.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    await app.close();
  });
});
