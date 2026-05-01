/**
 * TEST-F5 — useAuditLog unit tests.
 * fetch는 vi.stubGlobal로 격리. jsdom 환경.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuditLog } from '@/lib/hooks/use-admin';

let mockFetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return Wrapper;
}

const SAMPLE_RESPONSE = {
  items: [
    {
      id: 'al-1',
      action: 'task.create',
      actorId: 'u1',
      targetType: 'task',
      targetId: 't1',
      metadata: null,
      createdAt: '2026-05-01T00:00:00Z',
      actor: { id: 'u1', name: 'Alice', initials: 'AL', color: '#000' },
    },
  ],
  total: 1,
  page: 1,
  limit: 50,
};

describe('useAuditLog (TEST-F5)', () => {
  it('loading → success: returns items array', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => SAMPLE_RESPONSE });

    const { result } = renderHook(() => useAuditLog(), { wrapper: makeWrapper() });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
  });

  it('pagination params are passed in URL', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ...SAMPLE_RESPONSE, page: 2, limit: 10 }) });

    const { result } = renderHook(() => useAuditLog(2, 10), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('page=2');
    expect(url).toContain('limit=10');
  });

  it('API error → query transitions to error state', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useAuditLog(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
