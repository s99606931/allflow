'use client';

import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BusinessFlowStep } from '@/lib/api/extended';

interface BusinessFlowStepChipProps {
  step: BusinessFlowStep;
  idx: number;
  totalSteps: number;
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
  tooltipId: string;
  onSelect: (step: BusinessFlowStep) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>, idx: number) => void;
}

/**
 * 단일 플로우 단계 칩 — 현재/완료/미래 상태별 스타일링과
 * 키보드 내비게이션 hook 연결을 담당.
 * idx 가 마지막이 아니면 우측에 ArrowRight 분리자 렌더.
 */
export function BusinessFlowStepChip({
  step,
  idx,
  totalSteps,
  isCurrent,
  isPast,
  isFuture,
  tooltipId,
  onSelect,
  onKeyDown,
}: BusinessFlowStepChipProps) {
  const stateLabel = isCurrent ? ' · 현재' : isPast ? ' · 완료' : '';
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onSelect(step)}
        onKeyDown={(e) => onKeyDown(e, idx)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
          isCurrent &&
            'bg-accent text-accent-fg border-accent font-semibold shadow-sm ring-2 ring-accent/30',
          isPast &&
            'bg-accent/5 border-accent/40 text-accent-strong hover:bg-accent/10',
          isFuture &&
            'bg-bg border-dashed border-fg-3/30 text-fg-3 hover:text-fg-1 hover:border-fg-3/50',
        )}
        title={`${step.description}\n→ ${step.screen}`}
        aria-describedby={tooltipId}
        aria-current={isCurrent ? 'step' : undefined}
        aria-label={`${idx + 1}/${totalSteps} ${step.label}${stateLabel}`}
        data-testid={`business-flow-step-${step.id}`}
        data-current={isCurrent ? 'true' : undefined}
        data-completed={isPast ? 'true' : undefined}
      >
        {isPast ? (
          <CheckCircle2 size={11} className="text-accent-strong" />
        ) : (
          <Circle size={11} className={isCurrent ? '' : 'opacity-50'} />
        )}
        {step.label}
      </button>
      {idx < totalSteps - 1 && (
        <ArrowRight size={11} className="text-fg-3 shrink-0" aria-hidden />
      )}
    </li>
  );
}
