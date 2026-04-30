/**
 * Common API error mapper.
 *
 * Translates ky HTTPError / Zod ValidationError / network errors into a
 * normalized {@link ApiError} shape that components can render consistently
 * via toast / inline messages.
 *
 * Reference: PDCA-01 (foundation/api-contract).
 */
import { HTTPError, TimeoutError } from 'ky';
import { ZodError } from 'zod';

export type ApiErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'rate_limited'
  | 'server'
  | 'network'
  | 'timeout'
  | 'unknown';

export interface ApiError {
  kind: ApiErrorKind;
  status?: number;
  message: string;
  details?: unknown;
}

const STATUS_TO_KIND: Record<number, ApiErrorKind> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation',
  429: 'rate_limited',
};

const KIND_TO_TOAST: Record<ApiErrorKind, string> = {
  unauthorized: '로그인이 필요합니다.',
  forbidden: '접근 권한이 없습니다.',
  not_found: '대상을 찾을 수 없습니다.',
  conflict: '이미 존재하거나 충돌이 있습니다.',
  validation: '입력값을 확인해주세요.',
  rate_limited: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다.',
  network: '네트워크 연결을 확인해주세요.',
  timeout: '응답이 지연되고 있습니다.',
  unknown: '알 수 없는 오류가 발생했습니다.',
};

export function toApiError(error: unknown): ApiError {
  if (error instanceof TimeoutError) {
    return { kind: 'timeout', message: KIND_TO_TOAST.timeout };
  }
  if (error instanceof HTTPError) {
    const status = error.response.status;
    const kind = STATUS_TO_KIND[status] ?? (status >= 500 ? 'server' : 'unknown');
    return { kind, status, message: KIND_TO_TOAST[kind] };
  }
  if (error instanceof ZodError) {
    return { kind: 'validation', message: KIND_TO_TOAST.validation, details: error.issues };
  }
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return { kind: 'network', message: KIND_TO_TOAST.network };
  }
  if (error instanceof Error) {
    return { kind: 'unknown', message: error.message || KIND_TO_TOAST.unknown };
  }
  return { kind: 'unknown', message: KIND_TO_TOAST.unknown };
}

export function toastMessage(error: unknown): string {
  return toApiError(error).message;
}
