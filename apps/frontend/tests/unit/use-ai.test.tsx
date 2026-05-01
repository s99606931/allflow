/**
 * TEST-F9 — useAiThreads / useAiThreadMessages / useAiThreadMutations / useAiStream unit tests.
 * fetch는 vi.stubGlobal로 격리. SSE 스트리밍은 ReadableStream으로 시뮬레이션.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAiStream,
  useAiThreadMessages,
  useAiThreadMutations,
  useAiThreads,
} from '@/lib/hooks/use-ai';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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

const THREAD = { id: 'th-1', title: '새 대화', createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z' };
const MSG = { id: 'msg-1', role: 'user' as const, content: 'Hi', createdAt: '2026-05-01T00:00:00Z' };

describe('useAiThreads (TEST-F9)', () => {
  it('loading → success, returns thread array', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [THREAD] });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAiThreads(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.id).toBe('th-1');
  });

  it('API !ok → returns empty array (graceful)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAiThreads(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe('useAiThreadMessages (TEST-F9)', () => {
  it('disabled when threadId is null', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAiThreadMessages(null), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches messages when threadId provided', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [MSG] });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAiThreadMessages('th-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.role).toBe('user');
  });
});

describe('useAiThreadMutations (TEST-F9)', () => {
  it('create: success → invalidates ai-threads', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => THREAD });

    const { Wrapper, qc } = makeWrapper();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useAiThreadMutations(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.create.mutateAsync('새 대화');
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['ai-threads'] }),
    );
  });

  it('create: !ok response → mutation error + toast.error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const { toast } = await import('sonner');
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAiThreadMutations(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.create.mutateAsync().catch(() => undefined);
    });

    await waitFor(() => expect(result.current.create.isError).toBe(true));
    expect(vi.mocked(toast.error)).toHaveBeenCalledTimes(1);
  });

  it('remove: success → invalidates ai-threads', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const { Wrapper, qc } = makeWrapper();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useAiThreadMutations(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.remove.mutateAsync('th-1');
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['ai-threads'] }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/ai/threads/th-1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('useAiStream (TEST-F9)', () => {
  it('streaming: onDelta + onDone are called from SSE chunks', async () => {
    const chunks = [
      'data: {"delta":"Hello"}\n\n',
      'data: {"delta":" World"}\n\n',
      'data: {"done":true,"citations":[{"url":"http://x.com"}],"toolTrace":[]}\n\n',
    ].map((s) => new TextEncoder().encode(s));

    let i = 0;
    const stream = new ReadableStream({
      pull(ctrl) {
        if (i < chunks.length) ctrl.enqueue(chunks[i++]);
        else ctrl.close();
      },
    });

    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const { result } = renderHook(() => useAiStream());
    const deltas: string[] = [];
    let doneInfo: unknown = null;

    await act(async () => {
      await result.current.streamComplete(
        'test prompt',
        (d) => deltas.push(d),
        (info) => { doneInfo = info; },
      );
    });

    expect(deltas).toEqual(['Hello', ' World']);
    expect((doneInfo as { citations: unknown[] }).citations).toHaveLength(1);
    expect(result.current.streaming).toBe(false);
  });

  it('streaming: !ok response → onDone called with empty info, streaming stays false', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, body: null });

    const { result } = renderHook(() => useAiStream());
    let doneInfo: unknown = null;

    await act(async () => {
      await result.current.streamComplete('x', () => undefined, (i) => { doneInfo = i; });
    });

    expect(doneInfo).toEqual({ citations: [], toolTrace: [] });
    expect(result.current.streaming).toBe(false);
  });
});
