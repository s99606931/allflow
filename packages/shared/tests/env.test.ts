import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { EnvValidationError, getEnvVar, loadEnvFrom } from '../src/env/index.js';

describe('env.getEnvVar', () => {
  it('returns parsed value when present', () => {
    const v = getEnvVar({ PORT: '8080' }, 'PORT', z.coerce.number().int());
    expect(v).toBe(8080);
  });

  it('throws EnvValidationError on missing required', () => {
    expect(() => getEnvVar({}, 'PORT', z.string())).toThrow(EnvValidationError);
  });

  it('throws EnvValidationError on invalid value', () => {
    try {
      getEnvVar({ PORT: 'abc' }, 'PORT', z.coerce.number().int());
      throw new Error('should not reach');
    } catch (e) {
      expect(e).toBeInstanceOf(EnvValidationError);
      const err = e as EnvValidationError;
      expect(err.issues.length).toBeGreaterThan(0);
      expect(err.issues[0]).toMatch(/^PORT:/);
    }
  });

  it('uses schema default when value undefined and schema provides default', () => {
    const v = getEnvVar({}, 'NODE_ENV', z.enum(['dev', 'prod']).default('dev'));
    expect(v).toBe('dev');
  });
});

describe('env.loadEnvFrom', () => {
  it('parses multiple variables', () => {
    const out = loadEnvFrom(
      { HOST: '0.0.0.0', PORT: '8080' },
      { HOST: z.string(), PORT: z.coerce.number().int() },
    );
    expect(out).toEqual({ HOST: '0.0.0.0', PORT: 8080 });
  });

  it('aggregates multiple errors', () => {
    try {
      loadEnvFrom(
        { HOST: '', PORT: 'nope' },
        { HOST: z.string().min(1), PORT: z.coerce.number().int() },
      );
      throw new Error('should not reach');
    } catch (e) {
      expect(e).toBeInstanceOf(EnvValidationError);
      const err = e as EnvValidationError;
      expect(err.issues.length).toBe(2);
    }
  });
});
