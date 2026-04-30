/**
 * Deep secret redaction for log payloads.
 *
 * Walks plain objects and arrays, replacing values whose key matches a known
 * secret name with `[REDACTED]`. Cycle-safe via WeakSet, depth-bounded to
 * avoid runaway recursion on adversarial inputs.
 */

export interface RedactOptions {
  readonly keys?: readonly string[];
  readonly placeholder?: string;
  readonly maxDepth?: number;
}

export const DEFAULT_REDACT_KEYS: readonly string[] = [
  'password',
  'token',
  'authorization',
  'apikey',
  'api_key',
  'secret',
  'cookie',
  'set-cookie',
  'access_token',
  'refresh_token',
  'client_secret',
];

const DEFAULT_PLACEHOLDER = '[REDACTED]';
const DEFAULT_MAX_DEPTH = 6;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function shouldRedactKey(key: string, keys: readonly string[]): boolean {
  const lower = key.toLowerCase();
  for (const match of keys) {
    if (lower === match.toLowerCase()) return true;
  }
  return false;
}

interface WalkContext {
  readonly keys: readonly string[];
  readonly placeholder: string;
  readonly maxDepth: number;
  readonly seen: WeakSet<object>;
}

function walk(value: unknown, depth: number, ctx: WalkContext): unknown {
  if (depth > ctx.maxDepth) return '[REDACTED:DEPTH]';
  if (Array.isArray(value)) {
    if (ctx.seen.has(value)) return '[REDACTED:CYCLE]';
    ctx.seen.add(value);
    return value.map((item) => walk(item, depth + 1, ctx));
  }
  if (isPlainObject(value)) {
    if (ctx.seen.has(value)) return '[REDACTED:CYCLE]';
    ctx.seen.add(value);
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      if (shouldRedactKey(key, ctx.keys)) {
        out[key] = ctx.placeholder;
      } else {
        out[key] = walk(value[key], depth + 1, ctx);
      }
    }
    return out;
  }
  return value;
}

export function redactSecrets(value: unknown, options: RedactOptions = {}): unknown {
  const ctx: WalkContext = {
    keys: options.keys ?? DEFAULT_REDACT_KEYS,
    placeholder: options.placeholder ?? DEFAULT_PLACEHOLDER,
    maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
    seen: new WeakSet<object>(),
  };
  return walk(value, 0, ctx);
}
