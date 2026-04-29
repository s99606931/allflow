import type { FastifyInstance } from 'fastify';
import { VERSION } from '../../version.js';

/**
 * Health endpoint plugin — frontend/모니터링이 사용하는 liveness 체크.
 * OpenAPI: GET /health → 200 { status, uptime, version }
 *
 * 본격적인 readiness(DB/Redis 연결 확인)는 T-101 이후 별도 /ready로 분리.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok' as const,
    uptime: Math.round(process.uptime()),
    version: VERSION,
  }));
}
