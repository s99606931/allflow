/**
 * Offset pagination types — 1-indexed page + bounded pageSize.
 */

export interface OffsetPageInput {
  /** 1-indexed page number; values < 1 are clamped to 1. */
  readonly page?: number;
  /** Page size hint; clamped by `clampLimit`. */
  readonly pageSize?: number;
}

export interface OffsetPage<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
}
