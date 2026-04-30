/**
 * Cursor pagination types — opaque string cursor + bounded limit.
 */

export interface CursorPageInput {
  /** Opaque cursor returned by a previous page; omit for the first page. */
  readonly cursor?: string;
  /** Page size hint; clamped by `clampLimit`. */
  readonly limit?: number;
}

export interface CursorPage<T> {
  readonly items: readonly T[];
  /** Cursor for the next page; `null` if there is no next page. */
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}
