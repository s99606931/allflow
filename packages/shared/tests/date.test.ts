import { describe, expect, it } from 'vitest';
import { isIsoString, parseIso, toIsoString } from '../src/date/index.js';

describe('date.toIsoString', () => {
  it('Date input', () => {
    expect(toIsoString(new Date('2026-04-30T00:00:00Z'))).toBe('2026-04-30T00:00:00.000Z');
  });

  it('number (epoch ms)', () => {
    expect(toIsoString(0)).toBe('1970-01-01T00:00:00.000Z');
  });

  it('string input is normalized', () => {
    const out = toIsoString('2026-04-30T00:00:00Z');
    expect(out).toBe('2026-04-30T00:00:00.000Z');
  });

  it('throws on invalid Date', () => {
    expect(() => toIsoString(new Date('not-a-date'))).toThrow(RangeError);
  });

  it('throws on invalid string', () => {
    expect(() => toIsoString('not-a-date')).toThrow(RangeError);
  });

  it('throws on invalid number', () => {
    expect(() => toIsoString(Number.NaN)).toThrow(RangeError);
  });
});

describe('date.isIsoString', () => {
  it('accepts canonical UTC', () => {
    expect(isIsoString('2026-04-30T00:00:00.000Z')).toBe(true);
  });

  it('accepts offset form', () => {
    expect(isIsoString('2026-04-30T09:00:00+09:00')).toBe(true);
  });

  it('rejects malformed', () => {
    expect(isIsoString('2026-04-30')).toBe(false);
    expect(isIsoString('not-iso')).toBe(false);
    // @ts-expect-error guard non-string input
    expect(isIsoString(123)).toBe(false);
  });
});

describe('date.parseIso', () => {
  it('returns Date on success', () => {
    const d = parseIso('2026-04-30T00:00:00.000Z');
    expect(d).toBeInstanceOf(Date);
    expect(d!.toISOString()).toBe('2026-04-30T00:00:00.000Z');
  });

  it('returns null on failure', () => {
    expect(parseIso('bogus')).toBe(null);
  });
});
