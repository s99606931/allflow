/**
 * TEST-F14 — api-error.ts 단위 테스트.
 * toApiError / toastMessage / isErrorResponseEnvelope 순수 함수 검증.
 */
import { HTTPError, TimeoutError } from 'ky';
import { ZodError } from 'zod';
import { describe, expect, it } from 'vitest';
import { isErrorResponseEnvelope, toApiError, toastMessage } from '@/lib/api-error';

function makeHttpError(status: number): HTTPError {
  const res = new Response('', { status });
  const req = new Request('https://api.test');
  return new HTTPError(res, req, {} as never);
}

describe('toApiError (TEST-F14)', () => {
  it('TimeoutError → kind:timeout', () => {
    const err = new TimeoutError(new Request('https://api.test'));
    const result = toApiError(err);
    expect(result.kind).toBe('timeout');
    expect(result.message).toContain('지연');
  });

  it('HTTPError 401 → kind:unauthorized', () => {
    const result = toApiError(makeHttpError(401));
    expect(result.kind).toBe('unauthorized');
    expect(result.status).toBe(401);
  });

  it('HTTPError 403 → kind:forbidden', () => {
    expect(toApiError(makeHttpError(403)).kind).toBe('forbidden');
  });

  it('HTTPError 404 → kind:not_found', () => {
    expect(toApiError(makeHttpError(404)).kind).toBe('not_found');
  });

  it('HTTPError 409 → kind:conflict', () => {
    expect(toApiError(makeHttpError(409)).kind).toBe('conflict');
  });

  it('HTTPError 422 → kind:validation', () => {
    expect(toApiError(makeHttpError(422)).kind).toBe('validation');
  });

  it('HTTPError 429 → kind:rate_limited', () => {
    expect(toApiError(makeHttpError(429)).kind).toBe('rate_limited');
  });

  it('HTTPError 500 → kind:server', () => {
    expect(toApiError(makeHttpError(500)).kind).toBe('server');
  });

  it('HTTPError 503 (unmapped 5xx) → kind:server', () => {
    expect(toApiError(makeHttpError(503)).kind).toBe('server');
  });

  it('HTTPError 418 (unmapped non-5xx) → kind:unknown', () => {
    expect(toApiError(makeHttpError(418)).kind).toBe('unknown');
  });

  it('ZodError → kind:validation with details', () => {
    const ze = new ZodError([{ code: 'too_small', minimum: 1, origin: 'string', inclusive: true, message: 'min 1', path: ['name'] }]);
    const result = toApiError(ze);
    expect(result.kind).toBe('validation');
    expect(result.details).toBeTruthy();
  });

  it('TypeError with "fetch" in message → kind:network', () => {
    const result = toApiError(new TypeError('Failed to fetch'));
    expect(result.kind).toBe('network');
  });

  it('TypeError with "network" in message → kind:network', () => {
    const result = toApiError(new TypeError('network error'));
    expect(result.kind).toBe('network');
  });

  it('generic Error → kind:unknown, message preserved', () => {
    const result = toApiError(new Error('something went wrong'));
    expect(result.kind).toBe('unknown');
    expect(result.message).toBe('something went wrong');
  });

  it('non-Error value → kind:unknown', () => {
    const result = toApiError('plain string');
    expect(result.kind).toBe('unknown');
  });
});

describe('toastMessage (TEST-F14)', () => {
  it('returns the message string from toApiError', () => {
    const msg = toastMessage(new Error('boom'));
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });
});

describe('isErrorResponseEnvelope (TEST-F14)', () => {
  it('returns true for valid error envelope', () => {
    const envelope = {
      error: { code: 'NOT_FOUND', message: '찾을 수 없습니다', traceId: 'trace-1' },
    };
    expect(isErrorResponseEnvelope(envelope)).toBe(true);
  });

  it('returns false for missing error field', () => {
    expect(isErrorResponseEnvelope({ data: {} })).toBe(false);
  });

  it('returns false for error without required fields', () => {
    expect(isErrorResponseEnvelope({ error: { code: 'X' } })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isErrorResponseEnvelope(null)).toBe(false);
  });

  it('returns false for primitive', () => {
    expect(isErrorResponseEnvelope('string')).toBe(false);
  });
});
