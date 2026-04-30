/**
 * Pagination primitives — cursor + offset shapes plus a shared limit clamp.
 */
export type { CursorPage, CursorPageInput } from './cursor.js';
export type { OffsetPage, OffsetPageInput } from './offset.js';

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Bound a caller-supplied limit to a safe range.
 *
 * @param value caller input (may be undefined / NaN / negative)
 * @param max upper bound (default {@link MAX_LIMIT})
 */
export function clampLimit(value: number | undefined, max: number = MAX_LIMIT): number {
  if (value === undefined || Number.isNaN(value)) return DEFAULT_LIMIT;
  if (value < 1) return 1;
  if (value > max) return max;
  return Math.floor(value);
}
