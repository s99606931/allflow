/**
 * Isomorphic environment-variable getter.
 *
 * Callers pass an `EnvSource` (e.g. `process.env`, a Vite `import.meta.env`
 * snapshot, or a plain test object). This module never reads `process.env`
 * directly so it stays safe in browser bundles.
 */
import type { ZodType } from 'zod';

export interface EnvSource {
  readonly [key: string]: string | undefined;
}

export class EnvValidationError extends Error {
  readonly issues: readonly string[];

  constructor(message: string, issues: readonly string[]) {
    super(message);
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

/**
 * Read `key` from `source` and validate it with `schema`.
 * Throws {@link EnvValidationError} on missing or invalid values.
 */
export function getEnvVar<T>(source: EnvSource, key: string, schema: ZodType<T>): T {
  const raw = source[key];
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${key}: ${i.message}`);
    throw new EnvValidationError(`환경변수 검증 실패 (${key})`, issues);
  }
  return result.data;
}

/**
 * Validate multiple environment variables in one call.
 * Returns a typed object whose keys mirror `shape`.
 */
export function loadEnvFrom<TShape extends Record<string, ZodType>>(
  source: EnvSource,
  shape: TShape,
): { [K in keyof TShape]: TShape[K] extends ZodType<infer U> ? U : never } {
  const out: Record<string, unknown> = {};
  const issues: string[] = [];
  for (const key of Object.keys(shape) as Array<keyof TShape>) {
    const schema = shape[key]!;
    const result = schema.safeParse(source[key as string]);
    if (result.success) {
      out[key as string] = result.data;
    } else {
      for (const issue of result.error.issues) {
        issues.push(`${String(key)}: ${issue.message}`);
      }
    }
  }
  if (issues.length > 0) {
    throw new EnvValidationError(`환경변수 검증 실패 (${issues.length}건)`, issues);
  }
  return out as { [K in keyof TShape]: TShape[K] extends ZodType<infer U> ? U : never };
}
