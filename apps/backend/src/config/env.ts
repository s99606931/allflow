/**
 * Environment configuration loader.
 *
 * 책임:
 *  1) `process.env`를 zod 스키마로 검증하여 타입 안전한 `Env` 객체로 노출
 *  2) 필수 변수 누락 / 잘못된 값 입력 시 부트 즉시 실패 (한국어 에러 메시지)
 *  3) 모듈 어디서든 `getEnv()`로 캐시된 동일 인스턴스 사용
 *
 * 사용처:
 *   - `server.ts`: PORT/HOST 바인딩
 *   - `app.ts`: NODE_ENV/LOG_LEVEL 기반 logger 구성
 *   - 추후 T-101 이후: DATABASE_URL / REDIS_URL / AUTH_SECRET / OPENAI_API_KEY 등
 */
import { z } from 'zod';

const NODE_ENVS = ['development', 'test', 'production'] as const;
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const portSchema = z.coerce
  .number()
  .int()
  .min(1, 'PORT는 1 이상이어야 합니다')
  .max(65535, 'PORT는 65535 이하이어야 합니다');

/**
 * 베이스 부트 단계 환경 스키마.
 * T-101 이후 DATABASE_URL/REDIS_URL/AUTH_SECRET 등이 추가될 때 이 스키마를 확장한다.
 */
const databaseUrlSchema = z
  .string()
  .min(1, 'DATABASE_URL은 비어있을 수 없습니다')
  .refine(
    (v) => /^postgres(ql)?:\/\//i.test(v),
    'DATABASE_URL은 postgres:// 또는 postgresql:// 스킴이어야 합니다',
  );

const redisUrlSchema = z
  .string()
  .min(1, 'REDIS_URL은 비어있을 수 없습니다')
  .refine((v) => /^rediss?:\/\//i.test(v), 'REDIS_URL은 redis:// 또는 rediss:// 스킴이어야 합니다');

const envSchema = z.object({
  NODE_ENV: z.enum(NODE_ENVS).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: portSchema.default(8080),
  LOG_LEVEL: z.enum(LOG_LEVELS).optional(),
  DATABASE_URL: databaseUrlSchema.optional(),
  REDIS_URL: redisUrlSchema.optional(),
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET은 최소 32자 이상이어야 합니다 (next-auth 호환)')
    .optional(),
  OPENAI_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v)),
  // OpenTelemetry (Step 8) — default off. true 일 때만 NodeSDK 초기화.
  OTEL_ENABLED: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => {
      if (typeof v === 'boolean') return v;
      if (typeof v !== 'string') return false;
      return ['1', 'true', 'TRUE', 'yes', 'on'].includes(v);
    }),
  OTEL_EXPORTER_OTLP_ENDPOINT: z
    .string()
    .url('OTEL_EXPORTER_OTLP_ENDPOINT 는 URL 이어야 합니다 (예: http://otel-collector:4318)')
    .optional(),
  OTEL_SERVICE_NAME: z.string().min(1).default('all-flow-backend'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * 환경변수를 검증하고 캐시된 Env 객체를 반환한다.
 * 검증 실패 시 한국어 에러 메시지를 출력하고 프로세스를 종료시킨다.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new EnvValidationError(`환경변수 검증 실패\n${issues}`);
  }
  cached = result.data;
  return cached;
}

export function getEnv(): Env {
  return cached ?? loadEnv();
}

/**
 * 테스트 전용. 캐시를 비우고 다시 로드할 수 있게 한다.
 */
export function resetEnvForTests(): void {
  cached = null;
}

export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
  }
}
