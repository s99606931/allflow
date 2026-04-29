/**
 * Fastify 글로벌 에러 핸들러 + 404 핸들러.
 *
 * 매핑 규칙:
 *  - ZodError       → 400 VALIDATION_FAILED
 *  - AppError 계열  → 정의된 statusCode/code
 *  - Fastify 기본   → err.statusCode 우선 (sensible 사용 시 4xx 보존)
 *  - 그 외          → 500 INTERNAL + traceId
 *
 * 모든 응답은 `ErrorResponse` 형태로 직렬화한다.
 */
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError, type ErrorResponse } from '../shared/errors.js';

function buildResponse(args: {
  code: string;
  message: string;
  details?: unknown;
  traceId: string;
}): ErrorResponse {
  return {
    error: {
      code: args.code,
      message: args.message,
      ...(args.details !== undefined ? { details: args.details } : {}),
      traceId: args.traceId,
    },
  };
}

function fromZod(err: ZodError, traceId: string): ErrorResponse {
  return buildResponse({
    code: 'VALIDATION_FAILED',
    message: '요청 본문 검증 실패',
    details: err.issues.map((i) => ({
      path: i.path.join('.') || '(root)',
      message: i.message,
    })),
    traceId,
  });
}

async function plugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((err: FastifyError, req: FastifyRequest, reply: FastifyReply) => {
    const traceId = req.id;

    if (err instanceof ZodError) {
      reply.code(400).send(fromZod(err, traceId));
      return;
    }
    if (err instanceof AppError) {
      reply
        .code(err.statusCode)
        .send(
          buildResponse({ code: err.code, message: err.message, details: err.details, traceId }),
        );
      return;
    }

    const status =
      typeof err.statusCode === 'number' && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) {
      req.log.error({ err, traceId }, 'unhandled error');
    } else {
      req.log.warn({ err, traceId }, 'request failed');
    }
    reply.code(status).send(
      buildResponse({
        code: err.code ?? (status >= 500 ? 'INTERNAL' : 'BAD_REQUEST'),
        message: status >= 500 ? '내부 서버 오류' : err.message,
        traceId,
      }),
    );
  });

  app.setNotFoundHandler((req: FastifyRequest, reply: FastifyReply) => {
    reply.code(404).send(
      buildResponse({
        code: 'NOT_FOUND',
        message: `경로를 찾을 수 없습니다: ${req.method} ${req.url}`,
        traceId: req.id,
      }),
    );
  });
}

export const errorHandlerPlugin = fp(plugin, { name: 'error-handler' });
