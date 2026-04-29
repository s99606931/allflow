/**
 * 공통 에러 + 통일 ErrorResponse 포맷.
 *
 * 책임:
 *  1) 도메인이 던지는 에러를 4xx로 매핑할 수 있도록 표준 클래스 제공
 *  2) Fastify 글로벌 에러 핸들러가 ErrorResponse 직렬화에 사용
 *  3) traceId(요청 ID) 를 모든 에러 응답에 포함
 */

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    traceId: string;
  };
}

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(params: { code: string; message: string; statusCode: number; details?: unknown }) {
    super(params.message);
    this.name = 'AppError';
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.details = params.details;
  }
}

export class AuthError extends AppError {
  constructor(message = '인증이 필요합니다', details?: unknown) {
    super({ code: 'AUTH_REQUIRED', message, statusCode: 401, details });
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '권한이 없습니다', details?: unknown) {
    super({ code: 'FORBIDDEN', message, statusCode: 403, details });
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super({
      code: 'NOT_FOUND',
      message: id ? `${resource} not found: ${id}` : `${resource} not found`,
      statusCode: 404,
    });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ code: 'CONFLICT', message, statusCode: 409, details });
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ code: 'VALIDATION_FAILED', message, statusCode: 400, details });
    this.name = 'ValidationError';
  }
}
