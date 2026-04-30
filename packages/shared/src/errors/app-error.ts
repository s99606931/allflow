/**
 * Base application error + standard wire envelope.
 *
 * - `AppError` is the parent of every typed HTTP error in this package.
 * - `ErrorResponse` is the JSON shape that BE returns and FE deserializes.
 * - Pure ECMAScript: no Node-only or Browser-only API.
 */

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    traceId: string;
  };
}

export interface AppErrorParams {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(params: AppErrorParams) {
    super(params.message);
    this.name = 'AppError';
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.details = params.details;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export function toErrorResponse(error: AppError, traceId: string): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      traceId,
    },
  };
}
