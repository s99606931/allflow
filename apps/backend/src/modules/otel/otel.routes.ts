/**
 * OTel 진단 endpoint — `/otel/health` (api/v1 prefix 그룹 내 등록).
 *
 * 응답: `{ enabled: bool, serviceName: string, endpoint: string|null }`
 * 사용처: dev/CI 진단, Step 9 collector 도입 시 활성화 검증.
 *
 * health.routes.ts 와 분리 (책임 분리: BE 가동 신호 vs OTel 활성화 신호).
 */
import type { FastifyPluginAsync } from 'fastify';

export interface OtelRouteOptions {
  state: {
    enabled: boolean;
    serviceName: string;
    endpoint: string | null;
  };
}

export const otelRoutes: FastifyPluginAsync<OtelRouteOptions> = async (app, opts) => {
  app.get('/otel/health', async () => ({
    enabled: opts.state.enabled,
    serviceName: opts.state.serviceName,
    endpoint: opts.state.endpoint,
  }));
};
