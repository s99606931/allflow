/**
 * useBusinessFlowProgress — 4차 PDCA: 비즈니스 플로우 진행 상태 서버 동기화 훅.
 *
 * 정책:
 *  - 서버를 single source of truth 로 사용. localStorage 는 fallback (offline / 비로그인) 만.
 *  - PATCH 는 멱등이므로 디바운스 없이 즉시 호출 (네트워크 부담은 무시할 수준).
 *  - currentStepId 변경 시 자동으로 서버에 반영. 마운트 시 기존 진행 상태 fetch.
 *  - 서버 401/네트워크 오류 시 silent fallback (UI 가 끊기지 않게).
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BusinessFlowProgress } from '@/lib/api/extended';

export interface UseBusinessFlowProgressResult {
  /** 현재 단계 id (서버 → 폴백). 로딩 중에는 fallbackCurrentStepId 사용. */
  currentStepId: string;
  /** 완료된 step.id 집합 (정렬됨). */
  completedSteps: string[];
  /** 6차 PDCA: 현재 단계가 시작된 시각 (ISO). 서버 행이 없으면 undefined. */
  stepStartedAt: string | undefined;
  /** 서버 fetch 진행 중 여부. */
  isLoading: boolean;
  /** 진행 상태 갱신 트리거 (멱등). */
  setProgress: (next: { currentStepId: string; completedSteps?: string[] }) => void;
}

const queryKey = (flowId: string) => ['business-flow-progress', flowId];

/**
 * 서버사이드 진행 상태와 동기화. fallbackCurrentStepId 는 서버 행이 없을 때 보일 기본값.
 */
export function useBusinessFlowProgress(
  flowId: string,
  fallbackCurrentStepId: string,
  options: { enabled?: boolean } = {},
): UseBusinessFlowProgressResult {
  const enabled = options.enabled ?? true;
  const qc = useQueryClient();

  const query = useQuery<BusinessFlowProgress | null>({
    queryKey: queryKey(flowId),
    queryFn: async () => {
      try {
        const res = await api.getBusinessFlowProgress(flowId);
        // 서버가 행 없을 때 { flowId, progress: null } 반환 → null 로 정규화.
        if ('progress' in res && res.progress === null) return null;
        return res as BusinessFlowProgress;
      } catch {
        // 인증 실패 / 네트워크 오류 → 폴백 (UI 동작은 유지).
        return null;
      }
    },
    staleTime: 30_000,
    enabled,
  });

  const mutation = useMutation({
    mutationFn: async (input: { currentStepId: string; completedSteps?: string[] }) =>
      api.patchBusinessFlowProgress(flowId, input),
    onSuccess: (data) => {
      qc.setQueryData(queryKey(flowId), data);
    },
    // 실패는 silent — 다음 currentStepId 변경 시 재시도 기회 있음.
  });

  const data = query.data;
  const currentStepId = data?.currentStepId ?? fallbackCurrentStepId;
  const completedSteps = useMemo(() => data?.completedSteps ?? [], [data]);

  const setProgress = useCallback(
    (next: { currentStepId: string; completedSteps?: string[] }) => {
      mutation.mutate(next);
    },
    [mutation],
  );

  // fallbackCurrentStepId 가 바뀌었는데 서버에 진행 상태가 없으면 즉시 등록.
  // (페이지 진입 시 자동으로 서버에 현재 단계 기록)
  useEffect(() => {
    if (!enabled) return;
    if (!query.isFetched) return;
    if (data) return;
    mutation.mutate({ currentStepId: fallbackCurrentStepId });
    // mutation 자체는 stable 한 객체가 아니라서 의존성에서 제외 (중복 호출 방지).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, query.isFetched, data, fallbackCurrentStepId]);

  return {
    currentStepId,
    completedSteps,
    stepStartedAt: data?.stepStartedAt,
    isLoading: query.isLoading,
    setProgress,
  };
}
