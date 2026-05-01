/**
 * TEST-F11 — useUserMap unit tests.
 * useUsers (use-data) 를 mock으로 대체하여 Map 변환 로직만 검증.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hooks/use-data', () => ({
  useUsers: vi.fn(),
}));

import { useUsers } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return Wrapper;
}

describe('useUserMap (TEST-F11)', () => {
  it('returns a Map of users keyed by id', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: [
        { id: 'u1', name: 'Alice', email: 'a@a.com', role: 'member', initials: 'AL', color: '#000', status: 'active', createdAt: '' },
        { id: 'u2', name: 'Bob', email: 'b@b.com', role: 'member', initials: 'BO', color: '#111', status: 'active', createdAt: '' },
      ],
    } as unknown as ReturnType<typeof useUsers>);

    const { result } = renderHook(() => useUserMap(), { wrapper: makeWrapper() });

    expect(result.current.size).toBe(2);
    expect(result.current.get('u1')?.name).toBe('Alice');
    expect(result.current.get('u2')?.name).toBe('Bob');
  });

  it('returns empty Map when users array is empty', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useUsers>);

    const { result } = renderHook(() => useUserMap(), { wrapper: makeWrapper() });

    expect(result.current.size).toBe(0);
  });

  it('returns empty Map when data is undefined (loading state)', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useUsers>);

    const { result } = renderHook(() => useUserMap(), { wrapper: makeWrapper() });

    expect(result.current.size).toBe(0);
  });
});
