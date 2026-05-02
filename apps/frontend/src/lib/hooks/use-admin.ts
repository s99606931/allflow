'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { toastMessage } from '@/lib/api-error';
import type { SessionItem } from '@/lib/api/extended';

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

export function useSecurityLog(limit = 10) {
  return useQuery<AuditLogResponse>({
    queryKey: ['audit-log', 'security', limit],
    queryFn: async () => {
      const res = await fetch(`/api/v1/audit-log?action=auth.&limit=${limit}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('보안 로그를 불러오지 못했습니다');
      return res.json() as Promise<AuditLogResponse>;
    },
  });
}

const SESSIONS_KEY = ['auth', 'sessions'] as const;

export function useSessions() {
  return useQuery<{ items: SessionItem[] }>({
    queryKey: SESSIONS_KEY,
    queryFn: () => api.listSessions(),
    refetchOnWindowFocus: false,
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.revokeSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY });
      qc.invalidateQueries({ queryKey: ['audit-log'] });
      toast.success('세션이 종료되었습니다');
    },
    onError: (err: unknown) => toast.error(toastMessage(err)),
  });
}

export function useRevokeAllOtherSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.revokeAllOtherSessions(),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY });
      qc.invalidateQueries({ queryKey: ['audit-log'] });
      toast.success(
        data.revoked > 0
          ? `${data.revoked}개의 다른 세션이 종료되었습니다`
          : '종료할 다른 세션이 없습니다',
      );
    },
    onError: (err: unknown) => toast.error(toastMessage(err)),
  });
}

// ── MFA ──────────────────────────────────────────────────────────────

export interface MfaStatus {
  enabled: boolean;
  recoveryCodesRemaining: number;
}

export interface MfaSetupResult {
  otpUri: string;
  secret: string;
}

const MFA_STATUS_KEY = ['mfa', 'status'] as const;

export function useMfaStatus() {
  return useQuery<MfaStatus>({
    queryKey: MFA_STATUS_KEY,
    queryFn: async () => {
      const res = await fetch('/api/v1/auth/mfa/status', { credentials: 'include' });
      if (!res.ok) throw new Error('MFA 상태를 불러오지 못했습니다');
      return res.json() as Promise<MfaStatus>;
    },
  });
}

export function useMfaSetup() {
  return useMutation<MfaSetupResult>({
    mutationFn: async () => {
      const res = await fetch('/api/v1/auth/mfa/setup', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('MFA 설정을 시작할 수 없습니다');
      return res.json() as Promise<MfaSetupResult>;
    },
  });
}

export function useMfaVerify() {
  const qc = useQueryClient();
  return useMutation<{ enabled: boolean; recoveryCodes: string[] }, Error, { code: string }>({
    mutationFn: async ({ code }) => {
      const res = await fetch('/api/v1/auth/mfa/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err?.error?.message ?? '인증 코드가 올바르지 않습니다.');
      }
      return res.json() as Promise<{ enabled: boolean; recoveryCodes: string[] }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MFA_STATUS_KEY });
      toast.success('MFA가 활성화되었습니다');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useMfaDisable() {
  const qc = useQueryClient();
  return useMutation<{ disabled: boolean }, Error, { code: string }>({
    mutationFn: async ({ code }) => {
      const res = await fetch('/api/v1/auth/mfa', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err?.error?.message ?? '인증 코드가 올바르지 않습니다.');
      }
      return res.json() as Promise<{ disabled: boolean }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MFA_STATUS_KEY });
      toast.success('MFA가 비활성화되었습니다');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useMfaRecoveryCodes() {
  const qc = useQueryClient();
  return useMutation<{ recoveryCodes: string[] }, Error, { code: string }>({
    mutationFn: async ({ code }) => {
      const res = await fetch('/api/v1/auth/mfa/recovery', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err?.error?.message ?? '인증 코드가 올바르지 않습니다.');
      }
      return res.json() as Promise<{ recoveryCodes: string[] }>;
    },
    onError: (err) => toast.error(err.message),
  });
}
