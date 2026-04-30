'use client';
/**
 * AI-specific hooks — SSE streaming + thread CRUD.
 * Separated from use-data.ts to keep files under 500 LOC.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { toastMessage } from '@/lib/api-error';

const onError = (err: unknown) => {
  toast.error(toastMessage(err));
};

/* ----------------------------------------- AI Thread types -------------- */

export interface AiThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: unknown;
  citations?: unknown[];
  model?: string;
  createdAt: string;
}

/* ----------------------------------------- AI Stream hook --------------- */

export function useAiStream() {
  const [streaming, setStreaming] = useState(false);

  const streamComplete = useCallback(async (
    prompt: string,
    onDelta: (delta: string) => void,
    onDone: (citations: unknown[]) => void,
    context?: Record<string, unknown>,
  ) => {
    setStreaming(true);
    try {
      const res = await fetch('/api/v1/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, stream: true, context }),
        credentials: 'include',
      });
      if (!res.ok || !res.body) { onDone([]); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.startsWith('data: ') ? part.slice(6) : part;
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line) as { delta?: string; done?: boolean; citations?: unknown[] };
            if (parsed.delta) onDelta(parsed.delta);
            if (parsed.done) onDone(parsed.citations ?? []);
          } catch { /* ignore malformed chunk */ }
        }
      }
    } finally {
      setStreaming(false);
    }
  }, []);

  return { streamComplete, streaming };
}

/* ----------------------------------------- AI Thread hooks -------------- */

export function useAiThreads() {
  return useQuery<AiThread[]>({
    queryKey: ['ai-threads'],
    queryFn: async () => {
      const res = await fetch('/api/v1/ai/threads', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json() as Promise<AiThread[]>;
    },
  });
}

export function useAiThreadMessages(threadId: string | null) {
  return useQuery<AiMessage[]>({
    queryKey: ['ai-thread-messages', threadId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/ai/threads/${threadId}/messages`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json() as Promise<AiMessage[]>;
    },
    enabled: !!threadId,
  });
}

export function useAiThreadMutations() {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: async (title?: string) => {
      const res = await fetch('/api/v1/ai/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title ?? '새 대화' }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('thread create failed');
      return res.json() as Promise<AiThread>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-threads'] }),
    onError,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/ai/threads/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('thread delete failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-threads'] }),
    onError,
  });
  return { create, remove };
}
