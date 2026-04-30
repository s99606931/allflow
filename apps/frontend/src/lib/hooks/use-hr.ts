import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API = process.env.NEXT_PUBLIC_API_BASE ?? '/api/v1';

export interface LeaveRequest {
  id: string;
  type: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'OTHER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  reason?: string | null;
  createdAt: string;
  approver?: { id: string; name: string } | null;
}

export interface LeaveCreateInput {
  type: LeaveRequest['type'];
  startDate: string;
  endDate: string;
  reason?: string;
}

export function useLeaveRequests() {
  return useQuery<LeaveRequest[]>({
    queryKey: ['hr-leave'],
    queryFn: async () => {
      const res = await fetch(`${API}/hr/leave`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch leave requests');
      return res.json() as Promise<LeaveRequest[]>;
    },
  });
}

export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: LeaveCreateInput) => {
      const res = await fetch(`${API}/hr/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create leave request');
      return res.json() as Promise<LeaveRequest>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-leave'] });
    },
  });
}

export function useCancelLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API}/hr/leave/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!res.ok) throw new Error('Failed to cancel leave request');
      return res.json() as Promise<LeaveRequest>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-leave'] });
    },
  });
}
