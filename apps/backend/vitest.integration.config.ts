import { defineConfig } from 'vitest/config';

/**
 * 통합 테스트 (T-503) — testcontainers 로 postgres+redis 부팅 후 실제 흐름 검증.
 *
 * 실행:
 *   pnpm test:int
 *
 * Docker 미설치 환경에서는 setup.ts 가 자동으로 모든 테스트를 skip 처리.
 *
 * 단위 테스트(`pnpm test`)와 격리된 별도 컨피그.
 */
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 180_000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    setupFiles: ['tests/integration/setup.ts'],
  },
});
