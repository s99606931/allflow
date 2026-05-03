/**
 * useBusinessFlowProgress 훅 테스트 — 4차 PDCA.
 *
 * 검증 포인트:
 *  - enabled=false 시 fetch/patch 호출 없음
 *  - enabled=true + 서버 행 없음 → 자동 PATCH 로 현재 단계 등록
 *  - 서버 행 존재 시 currentStepId/completedSteps 가 반영됨
 *  - setProgress 호출 시 PATCH 발사
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBusinessFlowProgress } from '@/lib/hooks/use-business-flow-progress';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    getBusinessFlowProgress: vi.fn(),
    patchBusinessFlowProgress: vi.fn(),
  },
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useBusinessFlowProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('enabled=false 면 네트워크 호출 없이 폴백 currentStepId 만 노출', () => {
    const { result } = renderHook(
      () => useBusinessFlowProgress('project-lifecycle', 'plan', { enabled: false }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.currentStepId).toBe('plan');
    expect(result.current.completedSteps).toEqual([]);
    expect(api.getBusinessFlowProgress).not.toHaveBeenCalled();
    expect(api.patchBusinessFlowProgress).not.toHaveBeenCalled();
  });

  it('서버 행 없으면 자동으로 현재 단계 PATCH', async () => {
    vi.mocked(api.getBusinessFlowProgress).mockResolvedValue({
      flowId: 'project-lifecycle',
      progress: null,
    });
    vi.mocked(api.patchBusinessFlowProgress).mockResolvedValue({
      flowId: 'project-lifecycle',
      currentStepId: 'plan',
      completedSteps: [],
      stepStartedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderHook(() => useBusinessFlowProgress('project-lifecycle', 'plan'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(api.patchBusinessFlowProgress).toHaveBeenCalledWith('project-lifecycle', {
        currentStepId: 'plan',
      });
    });
  });

  it('서버 행 존재 시 서버 데이터를 single source of truth 로 사용', async () => {
    vi.mocked(api.getBusinessFlowProgress).mockResolvedValue({
      flowId: 'project-lifecycle',
      currentStepId: 'execute',
      completedSteps: ['plan', 'kickoff'],
      stepStartedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const { result } = renderHook(
      () => useBusinessFlowProgress('project-lifecycle', 'plan'),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(result.current.currentStepId).toBe('execute');
    });
    expect(result.current.completedSteps).toEqual(['plan', 'kickoff']);
    // 서버 행이 있으면 자동 PATCH 안 함.
    expect(api.patchBusinessFlowProgress).not.toHaveBeenCalled();
  });

  it('setProgress 호출 시 PATCH 발사', async () => {
    vi.mocked(api.getBusinessFlowProgress).mockResolvedValue({
      flowId: 'project-lifecycle',
      currentStepId: 'plan',
      completedSteps: [],
      stepStartedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(api.patchBusinessFlowProgress).mockResolvedValue({
      flowId: 'project-lifecycle',
      currentStepId: 'execute',
      completedSteps: ['plan', 'kickoff'],
      stepStartedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const { result } = renderHook(
      () => useBusinessFlowProgress('project-lifecycle', 'plan'),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(result.current.currentStepId).toBe('plan');
    });

    act(() => {
      result.current.setProgress({
        currentStepId: 'execute',
        completedSteps: ['plan', 'kickoff'],
      });
    });

    await waitFor(() => {
      expect(api.patchBusinessFlowProgress).toHaveBeenCalledWith('project-lifecycle', {
        currentStepId: 'execute',
        completedSteps: ['plan', 'kickoff'],
      });
    });
  });
});
