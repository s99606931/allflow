/**
 * Shared ky HTTP client + Zod-validated response helper.
 *
 * Lives in its own module so resource-scoped api files (tasks, issues, ...)
 * can import the same singleton without circular deps.
 */
import ky from 'ky';
import type { z } from 'zod';

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';

export const http = ky.create({
  prefixUrl: BASE,
  timeout: 15_000,
  retry: { limit: 1 },
});

export const sleep = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export class ApiSchemaError extends Error {
  constructor(public readonly issues: z.ZodIssue[]) {
    super(`API schema mismatch: ${issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    this.name = 'ApiSchemaError';
  }
}

/** Validate an API response with Zod and return typed data. */
export async function parsed<T>(promise: Promise<unknown>, schema: z.ZodType<T>): Promise<T> {
  const raw = await promise;
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiSchemaError(result.error.issues);
  }
  return result.data;
}
