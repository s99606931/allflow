import { describe, expect, it } from 'vitest';
import { DEFAULT_REDACT_KEYS, redactSecrets } from '../src/redact/index.js';

describe('redact.redactSecrets', () => {
  it('redacts top-level password', () => {
    const out = redactSecrets({ user: 'alice', password: 'p@ss' });
    expect(out).toEqual({ user: 'alice', password: '[REDACTED]' });
  });

  it('case-insensitive key match', () => {
    const out = redactSecrets({ Authorization: 'Bearer x' });
    expect(out).toEqual({ Authorization: '[REDACTED]' });
  });

  it('redacts nested', () => {
    const out = redactSecrets({ outer: { inner: { token: 't' } } });
    expect(out).toEqual({ outer: { inner: { token: '[REDACTED]' } } });
  });

  it('walks arrays', () => {
    const out = redactSecrets([{ secret: 's' }, { keep: 'k' }]);
    expect(out).toEqual([{ secret: '[REDACTED]' }, { keep: 'k' }]);
  });

  it('handles cycles', () => {
    const a: Record<string, unknown> = { name: 'n' };
    a.self = a;
    const out = redactSecrets(a) as Record<string, unknown>;
    expect(out.name).toBe('n');
    expect(out.self).toBe('[REDACTED:CYCLE]');
  });

  it('respects maxDepth', () => {
    let cur: Record<string, unknown> = { v: 'leaf' };
    for (let i = 0; i < 10; i++) {
      cur = { next: cur };
    }
    const out = redactSecrets(cur, { maxDepth: 3 });
    // After exceeding, the placeholder appears somewhere down the chain.
    expect(JSON.stringify(out)).toContain('[REDACTED:DEPTH]');
  });

  it('custom keys + placeholder', () => {
    const out = redactSecrets({ pin: '1234' }, { keys: ['pin'], placeholder: '***' });
    expect(out).toEqual({ pin: '***' });
  });

  it('passes through primitives', () => {
    expect(redactSecrets('hello')).toBe('hello');
    expect(redactSecrets(42)).toBe(42);
    expect(redactSecrets(null)).toBe(null);
    expect(redactSecrets(undefined)).toBe(undefined);
    expect(redactSecrets(true)).toBe(true);
  });

  it('exposes default keys', () => {
    expect(DEFAULT_REDACT_KEYS).toContain('password');
    expect(DEFAULT_REDACT_KEYS).toContain('authorization');
  });
});
