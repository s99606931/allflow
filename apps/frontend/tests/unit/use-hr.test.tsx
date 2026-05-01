/**
 * TEST-F6 — useLeaveRequests / useCreateLeave / useCancelLeave unit tests.
 * fetch는 vi.stubGlobal로 격리.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCancelLeave, useCreateLeave, useLeaveRequests } from '@/lib/hooks/use-hr';

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
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

const LEAVE: {
  id: string; type: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'OTHER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  startDate: string; endDate: string; createdAt: string;
} = {
  id: 'lv-1',
  type: 'ANNUAL',
  status: 'PENDING',
  startDate: '2026-06-01',
  endDate: '2026-06-03',
  createdAt: '2026-05-01T00:00:00Z',
};

describe('use-hr hooks (TEST-F6)', () => {
  it('useLeaveRequests: loading → success, returns array', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [LEAVE] });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useLeaveRequests(), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.id).toBe('lv-1');
  });

  it('useCreateLeave: success → invalidates hr-leave query', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => LEAVE });

    const { Wrapper, qc } = makeWrapper();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useCreateLeave(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        type: 'ANNUAL',
        startDate: '2026-06-01',
        endDate: '2026-06-03',
      });
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['hr-leave'] }),
    );
  });

  it('useCreateLeave: API error → mutation transitions to error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateLeave(), { wrapper: Wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ type: 'SICK', startDate: '2026-06-01', endDate: '2026-06-01' })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('useCancelLeave: success → invalidates hr-leave query', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...LEAVE, status: 'CANCELLED' }),
    });

    const { Wrapper, qc } = makeWrapper();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useCancelLeave(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('lv-1');
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['hr-leave'] }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/hr/leave/lv-1/status'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
