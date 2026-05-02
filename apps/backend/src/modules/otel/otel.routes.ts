/**
 * OTel 진단 + 설정 endpoint — `/otel/health`, `/otel/config`.
 *
 * - GET   /otel/health  → 부팅 시점 enabled/serviceName/endpoint
 * - GET   /otel/config  → DB OtelConfig 단일행 (id="default")
 * - PATCH /otel/config  → enabled/endpoint/serviceName 부분 갱신 (서버 재시작 후 반영)
 *
 * health.routes.ts 와 분리 (책임 분리: BE 가동 신호 vs OTel 활성화 신호).
 */
import { ValidationError } from '@all-flow/shared/errors';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

export interface OtelRouteOptions {
  state: {
    enabled: boolean;
    serviceName: string;
    endpoint: string | null;
  };
}

const OTEL_DEFAULT_ID = 'default';

export const otelRoutes: FastifyPluginAsync<OtelRouteOptions> = async (app, opts) => {
  app.get('/otel/config', { preHandler: [app.authenticate] }, async () => {
    const row = await app.prisma.otelConfig.findUnique({ where: { id: OTEL_DEFAULT_ID } });
    if (row) {
      return {
        enabled: row.enabled,
        endpoint: row.endpoint,
        serviceName: row.serviceName,
      };
    }
    // 미저장 시 부팅 상태를 그대로 노출 (런타임과 일관)
    return {
      enabled: opts.state.enabled,
      endpoint: opts.state.endpoint,
      serviceName: opts.state.serviceName,
    };
  });

  app.patch('/otel/config', { preHandler: [app.authenticate] }, async (req) => {
    const Body = z
      .object({
        enabled: z.boolean().optional(),
        endpoint: z.string().url().nullable().optional(),
        serviceName: z.string().min(1).max(80).optional(),
      })
      .strict()
      .refine((d) => Object.keys(d).length > 0, {
        message: '변경할 필드를 1개 이상 전달하세요',
      });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const row = await app.prisma.otelConfig.upsert({
      where: { id: OTEL_DEFAULT_ID },
      create: {
        id: OTEL_DEFAULT_ID,
        enabled: parsed.data.enabled ?? false,
        endpoint: parsed.data.endpoint ?? null,
        serviceName: parsed.data.serviceName ?? opts.state.serviceName,
      },
      update: parsed.data,
    });

    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const actorId = req.user!.id;
    app.log.info(
      {
        action: 'otel.config.update',
        actorId,
        enabled: row.enabled,
        endpoint: row.endpoint,
      },
      'otel config updated (effective after restart)',
    );

    return {
      enabled: row.enabled,
      endpoint: row.endpoint,
      serviceName: row.serviceName,
      note: '변경 사항은 서버 재시작 후 적용됩니다',
    };
  });
};
