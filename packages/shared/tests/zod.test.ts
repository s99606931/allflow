import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '../src/errors/index.js';
import { parseOrThrow, safeParseOr } from '../src/zod/index.js';

const schema = z.object({ name: z.string().min(1) });

describe('zod.parseOrThrow', () => {
  it('returns parsed value on success', () => {
    expect(parseOrThrow(schema, { name: 'a' })).toEqual({ name: 'a' });
  });

  it('throws ValidationError on failure', () => {
    try {
      parseOrThrow(schema, { name: '' }, 'createUser');
      throw new Error('should not reach');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      const err = e as ValidationError;
      expect(err.statusCode).toBe(400);
      expect(err.message).toContain('createUser');
      expect(err.details).toBeTruthy();
    }
  });
});

describe('zod.safeParseOr', () => {
  it('returns parsed on success', () => {
    expect(safeParseOr(schema, { name: 'x' }, { name: 'fb' })).toEqual({ name: 'x' });
  });

  it('returns fallback on failure', () => {
    expect(safeParseOr(schema, { name: '' }, { name: 'fb' })).toEqual({ name: 'fb' });
  });
});
