/**
 * ALL-Flow Backend — entrypoint.
 *
 * 부트 책임:
 *  1) zod env loader로 환경변수 검증 (T-003)
 *  2) buildApp() 으로 Fastify 인스턴스 구성
 *  3) HOST/PORT 바인딩 (기본 0.0.0.0:8080)
 *  4) SIGINT/SIGTERM 시 graceful shutdown
 */
import { buildApp } from './app.js';
import { type Env, EnvValidationError, loadEnv } from './config/env.js';
import { initOtel } from './plugins/otel.js';

async function main(): Promise<void> {
  let env: Env;
  try {
    env = loadEnv();
  } catch (err) {
    if (err instanceof EnvValidationError) {
      process.stderr.write(`[env] ${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }

  // OTel SDK 초기화 — Fastify 인스턴스 생성 *이전* (auto-instrumentations require hook).
  // OTEL_ENABLED 미설정 시 dynamic import 자체가 skip 되어 cold-start 비용 0.
  const otel = await initOtel({
    OTEL_ENABLED: env.OTEL_ENABLED,
    OTEL_EXPORTER_OTLP_ENDPOINT: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    OTEL_SERVICE_NAME: env.OTEL_SERVICE_NAME,
    NODE_ENV: env.NODE_ENV,
  });

  const app = await buildApp({
    env,
    registerDb: true,
    registerRoutes: true,
    otelState: { enabled: otel.enabled, serviceName: otel.serviceName, endpoint: otel.endpoint },
  });
  app.log.info(
    { otel: otel.enabled, serviceName: otel.serviceName, endpoint: otel.endpoint },
    otel.enabled ? 'otel: enabled' : 'otel: disabled',
  );

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutdown signal received');
    try {
      await app.close();
      await otel.shutdown();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error({ err }, 'failed to start server');
    process.exit(1);
  }
}

void main();
