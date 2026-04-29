import { describe, expect, it } from 'vitest';
import { EnvValidationError, loadEnv, resetEnvForTests } from './env.js';

describe('config/env loadEnv', () => {
  it('기본값으로 development 환경을 만든다', () => {
    resetEnvForTests();
    const env = loadEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.HOST).toBe('0.0.0.0');
    expect(env.PORT).toBe(8080);
  });

  it('PORT 문자열을 number로 강제 변환한다', () => {
    resetEnvForTests();
    const env = loadEnv({ PORT: '3000' });
    expect(env.PORT).toBe(3000);
  });

  it('NODE_ENV 값이 잘못되면 EnvValidationError를 던진다', () => {
    resetEnvForTests();
    expect(() => loadEnv({ NODE_ENV: 'staging' })).toThrow(EnvValidationError);
  });

  it('PORT 범위(1~65535) 밖이면 실패한다', () => {
    resetEnvForTests();
    expect(() => loadEnv({ PORT: '0' })).toThrow(EnvValidationError);
    resetEnvForTests();
    expect(() => loadEnv({ PORT: '70000' })).toThrow(EnvValidationError);
  });

  it('LOG_LEVEL이 enum 외 값이면 실패한다', () => {
    resetEnvForTests();
    expect(() => loadEnv({ LOG_LEVEL: 'verbose' })).toThrow(EnvValidationError);
  });

  it('동일 호출에서 캐시된 동일 인스턴스를 돌려준다', () => {
    resetEnvForTests();
    const a = loadEnv({ PORT: '4000' });
    const b = loadEnv({ PORT: '5000' });
    expect(a).toBe(b);
    expect(a.PORT).toBe(4000);
  });

  it('DATABASE_URL이 비어있거나 잘못된 스킴이면 실패한다', () => {
    resetEnvForTests();
    expect(() => loadEnv({ DATABASE_URL: '' })).toThrow(EnvValidationError);
    resetEnvForTests();
    expect(() => loadEnv({ DATABASE_URL: 'mysql://localhost/db' })).toThrow(EnvValidationError);
  });

  it('DATABASE_URL이 postgres 스킴이면 통과한다', () => {
    resetEnvForTests();
    const url = 'postgresql://localhost:5432/allflow';
    const env = loadEnv({ DATABASE_URL: url });
    expect(env.DATABASE_URL).toBe(url);
  });
});
