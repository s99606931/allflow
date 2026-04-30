import { describe, expect, it } from 'vitest';
import {
  AppError,
  AuthError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  isAppError,
  toErrorResponse,
} from '../src/errors/index.js';

describe('errors', () => {
  it('AppError carries code/statusCode/details', () => {
    const e = new AppError({ code: 'X', message: 'm', statusCode: 418, details: { teapot: true } });
    expect(e.code).toBe('X');
    expect(e.statusCode).toBe(418);
    expect(e.details).toEqual({ teapot: true });
    expect(e.message).toBe('m');
  });

  it('AuthError defaults to 401 AUTH_REQUIRED', () => {
    const e = new AuthError();
    expect(e.statusCode).toBe(401);
    expect(e.code).toBe('AUTH_REQUIRED');
    expect(e).toBeInstanceOf(AppError);
  });

  it('ForbiddenError 403 FORBIDDEN', () => {
    expect(new ForbiddenError().statusCode).toBe(403);
    expect(new ForbiddenError().code).toBe('FORBIDDEN');
  });

  it('NotFoundError formats id', () => {
    expect(new NotFoundError('User', 'u1').message).toBe('User not found: u1');
    expect(new NotFoundError('User').message).toBe('User not found');
  });

  it('ConflictError 409', () => {
    expect(new ConflictError('dup').statusCode).toBe(409);
  });

  it('ValidationError 400', () => {
    expect(new ValidationError('bad').statusCode).toBe(400);
  });

  it('RateLimitError 429', () => {
    expect(new RateLimitError().statusCode).toBe(429);
    expect(new RateLimitError().code).toBe('RATE_LIMITED');
  });

  it('isAppError narrows correctly', () => {
    expect(isAppError(new AuthError())).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
    expect(isAppError(null)).toBe(false);
  });

  it('toErrorResponse builds wire envelope', () => {
    const env = toErrorResponse(new ValidationError('bad', [{ k: 'v' }]), 'trace-1');
    expect(env).toEqual({
      error: { code: 'VALIDATION_FAILED', message: 'bad', details: [{ k: 'v' }], traceId: 'trace-1' },
    });
  });
});
