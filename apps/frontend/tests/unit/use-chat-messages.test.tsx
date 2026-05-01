/**
 * TEST-F8 — useChatMessages / useSendMessage unit tests.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useChatMessages, useSendMessage } from '@/lib/hooks/use-chat-messages';

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

const MSG = {
  id: 'msg-1',
  content: 'Hello',
  channelId: 'ch-1',
  authorId: 'u1',
  parentId: null,
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  author: { id: 'u1', name: 'Alice', initials: 'AL', color: '#000' },
  replyCount: 0,
};

describe('use-chat-messages hooks (TEST-F8)', () => {
  it('useChatMessages: disabled when channelId is null', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useChatMessages(null), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('useChatMessages: fetches messages when channelId provided', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [MSG] });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useChatMessages('ch-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.id).toBe('msg-1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/channels/ch-1/messages'),
      expect.any(Object),
    );
  });

  it('useChatMessages: API error → error state', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useChatMessages('ch-1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('useSendMessage: success → invalidates [chat-messages, channelId]', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => MSG });

    const { Wrapper, qc } = makeWrapper();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useSendMessage(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ channelId: 'ch-1', text: 'Hello' });
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['chat-messages', 'ch-1'] }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/channels/ch-1/messages'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('useSendMessage: API error → mutation error state', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSendMessage(), { wrapper: Wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ channelId: 'ch-1', text: 'x' })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
