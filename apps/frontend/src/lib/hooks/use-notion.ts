import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API = process.env.NEXT_PUBLIC_API_BASE ?? '/api/v1';

export interface NotionConnection {
  id: string;
  workspaceName: string;
  createdAt: string;
}

export function useNotionConnections() {
  return useQuery<NotionConnection[]>({
    queryKey: ['notion-connections'],
    queryFn: async () => {
      const res = await fetch(`${API}/integrations/notion/connections`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch Notion connections');
      return res.json() as Promise<NotionConnection[]>;
    },
  });
}

export function useConnectNotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { workspaceId: string; workspaceName: string }) => {
      const res = await fetch(`${API}/integrations/notion/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Failed to connect');
      }
      return res.json() as Promise<{ id: string; workspaceName: string }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notion-connections'] }),
  });
}

export function useDisconnectNotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API}/integrations/notion/connections/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to disconnect');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notion-connections'] }),
  });
}

export function useSyncNotion() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/integrations/notion/sync`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to sync');
      return res.json() as Promise<{ synced: number }>;
    },
  });
}
