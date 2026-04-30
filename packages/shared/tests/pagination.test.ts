import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMIT, MAX_LIMIT, clampLimit } from '../src/pagination/index.js';

describe('pagination.clampLimit', () => {
  it('returns DEFAULT_LIMIT for undefined', () => {
    expect(clampLimit(undefined)).toBe(DEFAULT_LIMIT);
  });

  it('returns DEFAULT_LIMIT for NaN', () => {
    expect(clampLimit(Number.NaN)).toBe(DEFAULT_LIMIT);
  });

  it('clamps below 1 to 1', () => {
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(-5)).toBe(1);
  });

  it('clamps above MAX_LIMIT', () => {
    expect(clampLimit(101)).toBe(MAX_LIMIT);
    expect(clampLimit(9999)).toBe(MAX_LIMIT);
  });

  it('respects custom max', () => {
    expect(clampLimit(50, 25)).toBe(25);
    expect(clampLimit(10, 25)).toBe(10);
  });

  it('floors fractional values', () => {
    expect(clampLimit(20.7)).toBe(20);
  });
});
