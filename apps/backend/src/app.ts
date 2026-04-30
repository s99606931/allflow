import sensible from '@fastify/sensible';
import websocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';
import { type Env, getEnv } from './config/env.js';
import { buildDefaultAIRegistry } from './modules/ai/ai-adapter.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { approvalsRoutes } from './modules/approvals/approvals.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { channelsRoutes } from './modules/channels/channels.routes.js';
import { clientsRoutes } from './modules/clients/clients.routes.js';
import { commentsRoutes } from './modules/comments/comments.routes.js';
import { docsRoutes } from './modules/docs/docs.routes.js';
import { eventsRoutes } from './modules/events/events.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { identityRoutes } from './modules/identity/identity.routes.js';
import { issuesRoutes } from './modules/issues/issues.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { orgRoutes } from './modules/org/org.routes.js';
import { otelRoutes } from './modules/otel/otel.routes.js';
import { projectsRoutes } from './modules/projects/projects.routes.js';
import { realtimeBus } from './modules/realtime/realtime-bus.js';
import { realtimeRoutes } from './modules/realtime/realtime.routes.js';
import { realtimeWsRoutes } from './modules/realtime/realtime.ws.js';
import { type RedisFanoutHandle, attachRedisFanout } from './modules/realtime/redis-fanout.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';
import { resourcesRoutes } from './modules/resources/resources.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
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
  // OTel 상태 — server.ts 에서 initOtel() 결과를 주입. 미지정 시 disabled 표시.
  otelState?: { enabled: boolean; serviceName: string; endpoint: string | null };
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

  // health는 prefix 없이(외부 healthcheck용) + /api/v1 prefix(FE catch-all 통과용) 이중 등록.
  await app.register(healthRoutes);
  await app.register(healthRoutes, { prefix: '/api/v1' });

  // OTel 진단 endpoint — DB/Auth 없이도 동작 (Step 8 default off 검증용).
  const otelState = options.otelState ?? {
    enabled: false,
    serviceName: env.OTEL_SERVICE_NAME ?? 'all-flow-backend',
    endpoint: null,
  };
  await app.register(
    async (api) => {
      await api.register(otelRoutes, { state: otelState });
    },
    { prefix: '/api/v1' },
  );

  if (registerDb && registerRoutes) {
    const aiRegistry = buildDefaultAIRegistry({ OPENAI_API_KEY: env.OPENAI_API_KEY });
    await app.register(
      async (api) => {
        await api.register(identityRoutes);
        await api.register(projectsRoutes);
        await api.register(tasksRoutes);
        await api.register(issuesRoutes);
        await api.register(commentsRoutes);
        await api.register(notificationsRoutes);
        await api.register(realtimeRoutes);
        await api.register(realtimeWsRoutes);
        await api.register(aiRoutes, { registry: aiRegistry });
        await api.register(reportsRoutes, { registry: aiRegistry });
        await api.register(authRoutes);
        await api.register(approvalsRoutes);
        await api.register(clientsRoutes);
        await api.register(eventsRoutes);
        await api.register(resourcesRoutes);
        await api.register(docsRoutes);
        await api.register(channelsRoutes);
        await api.register(orgRoutes);
        await api.register(searchRoutes);
      },
      { prefix: '/api/v1' },
    );

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
