'use client';

import { useQuery } from '@tanstack/react-query';

export interface AuditLogActor {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  actorId: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: AuditLogActor;
}

export interface AuditLogResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
}

export function useAuditLog(page = 1, limit = 50) {
  return useQuery<AuditLogResponse>({
    queryKey: ['audit-log', page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/v1/audit-log?page=${page}&limit=${limit}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('감사 로그를 불러오지 못했습니다');
      return res.json() as Promise<AuditLogResponse>;
    },
  });
}
