'use client';

import { type RefObject, useCallback } from 'react';
import type { BusinessFlowStep } from '@/lib/api/extended';

interface UseStepperKeyboardParams {
  steps: BusinessFlowStep[];
  listRef: RefObject<HTMLOListElement | null>;
}

interface UseStepperKeyboardResult {
  handleStepKeyDown: (
    event: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => void;
}

/**
 * 7차 PDCA: 키보드 화살표 단계 이동 — ←/→ 로 이전/다음 단계 호출.
 * Home/End 로 첫/마지막 단계 포커스 이동.
 * onStepSelect 미지정 시 키보드는 시각적 포커스만 이동 (DOM focus 위임).
 */
export function useStepperKeyboard({
  steps,
  listRef,
}: UseStepperKeyboardParams): UseStepperKeyboardResult {
  const focusStepByOffset = useCallback(
    (fromIdx: number, offset: number) => {
      const targetIdx = fromIdx + offset;
      if (targetIdx < 0 || targetIdx >= steps.length) return;
      const target = steps[targetIdx];
      if (!target) return;
      const list = listRef.current;
      if (!list) return;
      const btn = list.querySelector<HTMLButtonElement>(
        `[data-testid="business-flow-step-${target.id}"]`,
      );
      btn?.focus();
    },
    [steps, listRef],
  );

  const handleStepKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        focusStepByOffset(idx, 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        focusStepByOffset(idx, -1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        focusStepByOffset(idx, -idx);
      } else if (event.key === 'End') {
        event.preventDefault();
        focusStepByOffset(idx, steps.length - 1 - idx);
      }
    },
    [focusStepByOffset, steps.length],
  );

  return { handleStepKeyDown };
}
