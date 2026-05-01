/**
 * TEST-F7 — useNotionConnections / useConnectNotion / useDisconnectNotion unit tests.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useConnectNotion, useDisconnectNotion, useNotionConnections } from '@/lib/hooks/use-notion';

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

const CONN = { id: 'nc-1', workspaceName: 'My Workspace', createdAt: '2026-05-01T00:00:00Z' };

describe('use-notion hooks (TEST-F7)', () => {
  it('useNotionConnections: loading → success, returns array', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [CONN] });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useNotionConnections(), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.workspaceName).toBe('My Workspace');
  });

  it('useNotionConnections: API error → error state', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useNotionConnections(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('useConnectNotion: success → invalidates notion-connections', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'nc-2', workspaceName: 'New WS' }),
    });

    const { Wrapper, qc } = makeWrapper();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useConnectNotion(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ workspaceId: 'ws-1', workspaceName: 'New WS' });
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['notion-connections'] }),
    );
  });

  it('useConnectNotion: server error JSON → throws extracted error message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'already connected' }),
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useConnectNotion(), { wrapper: Wrapper });

    let caughtMessage = '';
    await act(async () => {
      await result.current
        .mutateAsync({ workspaceId: 'ws-1', workspaceName: 'Dup' })
        .catch((e: Error) => {
          caughtMessage = e.message;
        });
    });

    expect(caughtMessage).toBe('already connected');
  });

  it('useDisconnectNotion: success → invalidates notion-connections', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const { Wrapper, qc } = makeWrapper();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useDisconnectNotion(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('nc-1');
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['notion-connections'] }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/integrations/notion/connections/nc-1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
