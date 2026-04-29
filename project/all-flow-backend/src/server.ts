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

  const app = await buildApp({ env, registerDb: true, registerRoutes: true });

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutdown signal received');
    try {
      await app.close();
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
