import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api/v1';

export interface ChatMessage {
  id: string;
  content: string;
  channelId: string;
  authorId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; initials: string; color: string };
  replyCount: number;
}

async function fetchMessages(channelId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json() as Promise<ChatMessage[]>;
}

async function sendMessage(channelId: string, text: string): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json() as Promise<ChatMessage>;
}

export function useChatMessages(channelId: string | null) {
  return useQuery({
    queryKey: ['chat-messages', channelId],
    queryFn: () => fetchMessages(channelId!),
    enabled: !!channelId,
    staleTime: 10_000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, text }: { channelId: string; text: string }) =>
      sendMessage(channelId, text),
    onSuccess: (_, { channelId }) => {
      qc.invalidateQueries({ queryKey: ['chat-messages', channelId] });
    },
  });
}
