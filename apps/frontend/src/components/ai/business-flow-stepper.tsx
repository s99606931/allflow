'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type {
  BusinessFlow,
  BusinessFlowStep,
  BusinessFlowSuggestion,
} from '@/lib/api/extended';
import { toast } from 'sonner';
import { useBusinessFlowProgress } from '@/lib/hooks/use-business-flow-progress';

const COLLAPSE_STORAGE_PREFIX = 'av:bf-stepper:collapsed:';

interface BusinessFlowStepperProps {
  /** 클라이언트가 알고 있는 플로우 정의 (정적). flow를 prop으로 직접 전달. */
  flow: BusinessFlow;
  /** 현재 사용자가 위치한 단계 id. */
  currentStepId: string;
  /**
   * 단계 클릭 시 호출 (선택). 라우팅 등.
   * 미지정 시 step.screen 으로 router.push(client-side) 처리는 호출자가 구현.
   */
  onStepSelect?: (step: BusinessFlowStep) => void;
  /** AI 제안에 추가 컨텍스트 전달 (예: "프로젝트 5개 진행 중"). */
  systemContext?: string;
  /**
   * 4차 PDCA: 서버사이드 진행 상태 동기화 사용 여부.
   * true 면 서버의 (currentStepId, completedSteps) 가 표시 데이터의 single source of truth.
   * false / 미지정이면 prop currentStepId 만 사용 (기존 동작 유지).
   */
  enableServerSync?: boolean;
  className?: string;
}

function readCollapsedState(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeCollapsedState(key: string, collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (collapsed) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
  } catch {
    // localStorage 비활성/쿼터 초과는 무시 — UI 상태는 메모리에서 유지된다.
  }
}

export function BusinessFlowStepper({
  flow,
  currentStepId: propCurrentStepId,
  onStepSelect,
  systemContext,
  enableServerSync = false,
  className,
}: BusinessFlowStepperProps) {
  const [suggestion, setSuggestion] = useState<BusinessFlowSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const storageKey = `${COLLAPSE_STORAGE_PREFIX}${flow.id}`;

  // 4차 PDCA: 서버사이드 진행 상태 동기화 (opt-in).
  // enableServerSync=false 일 때 훅은 호출되지만 useQuery 가 disabled → 네트워크 호출 없음.
  const serverProgress = useBusinessFlowProgress(flow.id, propCurrentStepId, {
    enabled: enableServerSync,
  });
  const currentStepId = enableServerSync ? serverProgress.currentStepId : propCurrentStepId;
  const completedSetFromServer = enableServerSync
    ? new Set(serverProgress.completedSteps)
    : null;

  // prop 의 현재 단계가 바뀌면 서버에도 반영 (멱등 PATCH).
  useEffect(() => {
    if (!enableServerSync) return;
    if (serverProgress.isLoading) return;
    if (serverProgress.currentStepId === propCurrentStepId) return;
    serverProgress.setProgress({
      currentStepId: propCurrentStepId,
      completedSteps: serverProgress.completedSteps,
    });
  }, [enableServerSync, propCurrentStepId, serverProgress]);
  // SSR/CSR hydration mismatch 회피: 서버에서는 항상 false 로 렌더, 마운트 후
  // localStorage 값을 읽어 동기화한다. setState-in-effect 경고는 의도된 패턴.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const stored = readCollapsedState(storageKey);
    if (stored) setCollapsed(true);
  }, [storageKey]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsedState(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const currentIdx = flow.steps.findIndex((s) => s.id === currentStepId);
  const totalSteps = flow.steps.length;
  // 진행률: 완료된 단계 수 ÷ 전체 (현재 단계는 진행 중이므로 미포함). currentIdx<0 이면 0.
  const progressPct =
    currentIdx < 0 ? 0 : Math.round((currentIdx / totalSteps) * 100);
  const currentStep = currentIdx >= 0 ? flow.steps[currentIdx] : undefined;

  const askAi = useCallback(async () => {
    setLoading(true);
    try {
      // 컨텍스트를 더 풍부하게: systemContext + 현재 단계 액션/aiHint.
      const enrichedContextParts = [
        systemContext,
        currentStep
          ? `현재 위치는 "${currentStep.label}" 단계로, 즉시 취할 액션은 "${currentStep.action}" 입니다.`
          : undefined,
        currentStep?.aiHint ? `사용자 의도 힌트: "${currentStep.aiHint}"` : undefined,
      ].filter((part): part is string => typeof part === 'string' && part.length > 0);
      const context = enrichedContextParts.join(' / ');

      const res = await api.suggestBusinessFlowNext(flow.id, {
        currentStepId,
        ...(context ? { context } : {}),
      });
      setSuggestion(res);
    } catch {
      toast.error('AI 다음 단계 제안을 가져오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [flow.id, currentStepId, systemContext, currentStep]);

  const dismiss = useCallback(() => setSuggestion(null), []);

  return (
    <div
      className={cn(
        'rounded-xl border border-fg-3/20 bg-bg-1 mb-4',
        className,
      )}
      data-testid="business-flow-stepper"
      data-collapsed={collapsed ? 'true' : undefined}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-fg-3/15">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center gap-2 cursor-pointer text-fg-1 hover:text-accent-strong transition-colors"
          aria-expanded={!collapsed}
          aria-label={collapsed ? '플로우 펼치기' : '플로우 접기'}
          data-testid="business-flow-toggle"
        >
          {collapsed ? (
            <ChevronDown size={12} className="text-fg-3 shrink-0" />
          ) : (
            <ChevronUp size={12} className="text-fg-3 shrink-0" />
          )}
          <Sparkles size={12} className="text-accent-strong shrink-0" />
          <span className="text-[11.5px] font-semibold">{flow.name}</span>
        </button>
        <span className="text-[11px] text-fg-3 ml-1">
          {currentIdx >= 0 ? `${currentIdx + 1} / ${totalSteps} 단계` : '단계 외'}
        </span>
        {currentIdx >= 0 && (
          <span
            className="text-[11px] text-fg-2 ml-1 tabular-nums"
            data-testid="business-flow-progress-text"
          >
            · {progressPct}%
          </span>
        )}
        <button
          type="button"
          onClick={askAi}
          disabled={loading}
          className="ml-auto text-[11px] px-2.5 py-0.5 rounded-full border border-accent/30 text-accent-strong hover:bg-accent/10 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
          data-testid="business-flow-ai-suggest"
        >
          {loading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
          AI 다음 단계
        </button>
      </div>
      {/* 진행률 막대 — 접혀 있어도 표시되어 한눈에 진척 파악 가능 */}
      {currentIdx >= 0 && (
        <div
          className="h-0.5 bg-fg-3/10 overflow-hidden"
          aria-hidden
          data-testid="business-flow-progress-bar"
        >
          <div
            className="h-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
      {!collapsed && (
        <div className="px-3 py-3">
          <ol className="flex items-center gap-1 flex-wrap">
            {flow.steps.map((step, idx) => {
              const isCurrent = step.id === currentStepId;
              // 서버 동기화 모드일 때는 서버가 완료 표기한 단계 우선,
              // 그 외엔 idx < currentIdx (기존 동작 유지).
              const isPast = completedSetFromServer
                ? completedSetFromServer.has(step.id) && !isCurrent
                : currentIdx >= 0 && idx < currentIdx;
              const isFuture = currentIdx >= 0 && idx > currentIdx && !isPast;
              return (
                <li key={step.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onStepSelect?.(step)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] transition-colors cursor-pointer',
                      isCurrent &&
                        'bg-accent text-accent-fg border-accent font-semibold shadow-sm ring-2 ring-accent/30',
                      isPast &&
                        'bg-accent/5 border-accent/40 text-accent-strong hover:bg-accent/10',
                      isFuture &&
                        'bg-bg border-dashed border-fg-3/30 text-fg-3 hover:text-fg-1 hover:border-fg-3/50',
                    )}
                    title={`${step.description}\n→ ${step.screen}`}
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
                  {idx < flow.steps.length - 1 && (
                    <ArrowRight size={11} className="text-fg-3 shrink-0" aria-hidden />
                  )}
                </li>
              );
            })}
          </ol>
          {suggestion && (
            <div
              className="mt-3 pt-3 border-t border-fg-3/15 text-[12px] leading-relaxed text-fg-1"
              data-testid="business-flow-suggestion"
            >
              <div className="flex items-start gap-2">
                <Sparkles size={11} className="text-accent-strong shrink-0 mt-0.5" />
                <div className="flex-1 whitespace-pre-wrap">{suggestion.suggestion}</div>
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-fg-3 hover:text-fg transition-colors"
                  aria-label="AI 제안 닫기"
                >
                  <X size={11} />
                </button>
              </div>
              {suggestion.nextStep && (
                <div className="mt-2 flex items-center gap-2 text-[11px] text-fg-2">
                  <span className="text-fg-3">다음 단계:</span>
                  <button
                    type="button"
                    onClick={() => suggestion.nextStep && onStepSelect?.(suggestion.nextStep)}
                    className="px-2 py-0.5 rounded-full bg-accent/10 text-accent-strong border border-accent/30 hover:bg-accent/20 transition-colors cursor-pointer"
                  >
                    {suggestion.nextStep.label} → {suggestion.nextStep.action}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
