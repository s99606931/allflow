import sensible from '@fastify/sensible';
import websocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';
import { type Env, getEnv } from './config/env.js';
import { buildDefaultAIRegistry } from './modules/ai/ai-adapter.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { approvalsRoutes } from './modules/approvals/approvals.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { clientsRoutes } from './modules/clients/clients.routes.js';
import { commentsRoutes } from './modules/comments/comments.routes.js';
import { eventsRoutes } from './modules/events/events.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { identityRoutes } from './modules/identity/identity.routes.js';
import { issuesRoutes } from './modules/issues/issues.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { projectsRoutes } from './modules/projects/projects.routes.js';
import { realtimeBus } from './modules/realtime/realtime-bus.js';
import { realtimeRoutes } from './modules/realtime/realtime.routes.js';
import { realtimeWsRoutes } from './modules/realtime/realtime.ws.js';
import { type RedisFanoutHandle, attachRedisFanout } from './modules/realtime/redis-fanout.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';
import { tasksRoutes } from './modules/tasks/tasks.routes.js';
import { authPlugin } from './plugins/auth.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { prismaPlugin } from './plugins/prisma.js';
import { rateLimitPlugin } from './plugins/rate-limit.js';
import { rbacPlugin } from './plugins/rbac.js';
import { tracingPlugin } from './plugins/tracing.js';

/**
 * Build a Fastify app instance with shared plugins and routes registered.
 *
 * 등록 순서:
 *   sensible → error-handler → rate-limit → prisma → auth → rbac → routes
 *
 * 옵션:
 *  - registerDb: false 로 설정하면 prisma/auth/rbac 미등록 (단위 테스트용).
 *  - registerRoutes: false 로 설정하면 도메인 라우트 미등록 (플러그인 단위 테스트용).
 */
export interface BuildAppOptions {
  logger?: boolean | object;
  env?: Env;
  registerDb?: boolean;
  registerRoutes?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? getEnv();
  // 단위 테스트 친화적 default: false. server.ts 가 명시적으로 true 로 켠다.
  const registerDb = options.registerDb ?? false;
  const registerRoutes = options.registerRoutes ?? false;

  const app = Fastify({
    logger: options.logger ?? defaultLogger(env),
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    trustProxy: true,
  });

  await app.register(sensible);
  await app.register(tracingPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(rateLimitPlugin);
  await app.register(websocket);

  if (registerDb) {
    await app.register(prismaPlugin);
    await app.register(authPlugin);
    await app.register(rbacPlugin);
  }

  await app.register(healthRoutes);

  if (registerDb && registerRoutes) {
    await app.register(identityRoutes);
    await app.register(projectsRoutes);
    await app.register(tasksRoutes);
    await app.register(issuesRoutes);
    await app.register(commentsRoutes);
    await app.register(notificationsRoutes);
    await app.register(realtimeRoutes);
    await app.register(realtimeWsRoutes);
    const aiRegistry = buildDefaultAIRegistry({ OPENAI_API_KEY: env.OPENAI_API_KEY });
    await app.register(aiRoutes, { registry: aiRegistry });
    await app.register(reportsRoutes, { registry: aiRegistry });
    await app.register(authRoutes);
    await app.register(approvalsRoutes);
    await app.register(clientsRoutes);
    await app.register(eventsRoutes);

    if (env.REDIS_URL) {
      const handle: RedisFanoutHandle = await attachRedisFanout(realtimeBus, env.REDIS_URL);
      app.addHook('onClose', async () => {
        await handle.close();
      });
      app.log.info({ channel: 'realtime:global' }, 'redis pub/sub fan-out attached');
    }
  }

  return app;
}

function defaultLogger(env: Env): boolean | object {
  const isProd = env.NODE_ENV === 'production';
  if (isProd) {
    return {
      level: env.LOG_LEVEL ?? 'info',
    };
  }
  return {
    level: env.LOG_LEVEL ?? 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    },
  };
}
