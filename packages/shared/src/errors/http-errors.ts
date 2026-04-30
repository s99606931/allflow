/**
 * Typed HTTP error subclasses.
 *
 * Status codes follow RFC 9110. Default messages are Korean to match the
 * existing BE convention; callers may override via the constructor argument.
 */
import { AppError } from './app-error.js';

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

export class RateLimitError extends AppError {
  constructor(message = '요청이 너무 많습니다', details?: unknown) {
    super({ code: 'RATE_LIMITED', message, statusCode: 429, details });
    this.name = 'RateLimitError';
  }
}
