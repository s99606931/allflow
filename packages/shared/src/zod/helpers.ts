/**
 * Lightweight zod helpers that return typed `AppError` instances on failure.
 */
import type { ZodType } from 'zod';
import { ValidationError } from '../errors/http-errors.js';

/**
 * Parse `value` with `schema`. Throws {@link ValidationError} on failure with
 * zod issues attached to `details`.
 */
export function parseOrThrow<T>(schema: ZodType<T>, value: unknown, where?: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const message = where ? `${where}: 입력값을 확인해주세요` : '입력값을 확인해주세요';
    throw new ValidationError(message, result.error.issues);
  }
  return result.data;
}

/**
 * Parse `value` with `schema`; return `fallback` on failure.
 */
export function safeParseOr<T>(schema: ZodType<T>, value: unknown, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}
