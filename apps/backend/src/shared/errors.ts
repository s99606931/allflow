/**
 * Re-export shim for shared error types.
 *
 * Step 4 of monorepo-microservices-2026-04-30: AppError + the typed HTTP
 * subclasses now live in `@all-flow/shared/errors` so that BE and FE can
 * agree on the wire envelope. Local imports (`from '../shared/errors'`) keep
 * working unchanged thanks to this re-export.
 *
 * `RateLimitError` is exported additionally and is intended to replace the
 * raw `reply.code(429)` call in `plugins/rate-limit.ts` in a follow-up step.
 */
export {
  AppError,
  type AppErrorParams,
  AuthError,
  ConflictError,
  type ErrorResponse,
  ForbiddenError,
  isAppError,
  NotFoundError,
  RateLimitError,
  toErrorResponse,
  ValidationError,
} from '@all-flow/shared/errors';
