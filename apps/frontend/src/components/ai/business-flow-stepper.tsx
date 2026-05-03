'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
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
const COMPLETION_STORAGE_PREFIX = 'av:bf-stepper:completed:';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CONFETTI_COUNT = 14;
const CONFETTI_DURATION_MS = 1400;
const CELEBRATE_GLOW_DURATION_MS = 3200;
const CONFETTI_COLORS = [
  'oklch(0.7 0.18 25)',
  'oklch(0.75 0.16 70)',
  'oklch(0.7 0.16 155)',
  'oklch(0.65 0.18 255)',
  'oklch(0.65 0.18 305)',
];

interface ConfettiPiece {
  id: number;
  color: string;
  x: number;
  y: number;
  rotate: number;
  delay: number;
}

function generateConfetti(seed: number): ConfettiPiece[] {
  // 결정적 의사난수 — SSR/CSR 일치 + 매 호출 다른 값.
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const t = (seed + i * 37) % 1000;
    const angle = (t / 1000) * Math.PI * 2;
    const distance = 60 + ((t * 7) % 60);
    pieces.push({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? 'oklch(0.65 0.18 255)',
      x: Math.cos(angle) * distance,
      y: -Math.abs(Math.sin(angle)) * distance - 20,
      rotate: ((t * 11) % 720) - 360,
      delay: (i % 5) * 40,
    });
  }
  return pieces;
}

/**
 * 단계 시작 후 표준 일수를 초과했는지 계산.
 * stepStartedAt 또는 expectedDays 가 없으면 false (경고 비활성).
 */
function computeOverdue(
  stepStartedAt: string | undefined,
  expectedDays: number | undefined,
  now: number = Date.now(),
): { overdue: boolean; daysElapsed: number; daysOver: number } {
  if (!stepStartedAt || !expectedDays || expectedDays <= 0) {
    return { overdue: false, daysElapsed: 0, daysOver: 0 };
  }
  const startedMs = Date.parse(stepStartedAt);
  if (Number.isNaN(startedMs)) {
    return { overdue: false, daysElapsed: 0, daysOver: 0 };
  }
  const daysElapsed = Math.floor((now - startedMs) / MS_PER_DAY);
  const daysOver = daysElapsed - expectedDays;
  return { overdue: daysOver > 0, daysElapsed, daysOver };
}

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

function readCelebratedState(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeCelebratedState(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // localStorage 비활성/쿼터 초과는 무시.
  }
}

/**
 * 모든 단계를 완주했는지 판정.
 * - 서버 동기화 모드: completedSteps 가 모든 step.id 를 포함
 * - 그 외: currentStepId 가 마지막 단계의 id
 */
function isFlowComplete(
  steps: BusinessFlowStep[],
  currentStepId: string,
  completedSet: Set<string> | null,
): boolean {
  if (steps.length === 0) return false;
  if (completedSet) {
    return steps.every((s) => completedSet.has(s.id));
  }
  return steps[steps.length - 1]?.id === currentStepId;
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
  const completedKey = `${COMPLETION_STORAGE_PREFIX}${flow.id}`;
  // useId 는 SSR/CSR 일관 — 툴팁/aria-describedby 연결에 사용.
  const tooltipBaseId = useId();

  // 4차 PDCA: 서버사이드 진행 상태 동기화 (opt-in).
  // enableServerSync=false 일 때 훅은 호출되지만 useQuery 가 disabled → 네트워크 호출 없음.
  const serverProgress = useBusinessFlowProgress(flow.id, propCurrentStepId, {
    enabled: enableServerSync,
  });
  const currentStepId = enableServerSync ? serverProgress.currentStepId : propCurrentStepId;
  const completedSetFromServer = enableServerSync
    ? new Set(serverProgress.completedSteps)
    : null;
  const stepStartedAt = enableServerSync ? serverProgress.stepStartedAt : undefined;

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

  // 6차 PDCA: 단계 완료 감지 — currentStepId 가 다음 인덱스로 전진하면
  // (a) sonner toast 로 다음 단계 알림, (b) AI 제안 자동 트리거.
  // 첫 마운트와 뒤로 가기(인덱스 감소)는 무시.
  const prevStepIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevStepIdRef.current;
    prevStepIdRef.current = currentStepId;
    if (prev === null || prev === currentStepId) return;
    const prevIdx = flow.steps.findIndex((s) => s.id === prev);
    const nextIdx = flow.steps.findIndex((s) => s.id === currentStepId);
    if (prevIdx < 0 || nextIdx < 0) return;
    if (nextIdx <= prevIdx) return; // 뒤로 또는 점프-아웃 → 알림 없음
    const nextStep = flow.steps[nextIdx];
    if (!nextStep) return;
    toast.success(`다음 단계: ${nextStep.label}`, {
      description: nextStep.action,
    });
  }, [currentStepId, flow.steps]);
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

  // 6차 PDCA: overdue 경고 (서버 동기화 모드 + expectedDays 정의된 경우만).
  const overdueInfo = computeOverdue(stepStartedAt, currentStep?.expectedDays);

  // 7차 PDCA: 키보드 화살표 단계 이동 — ←/→ 로 이전/다음 단계 호출.
  // onStepSelect 미지정 시 키보드는 시각적 포커스만 이동 (DOM focus 위임).
  const stepListRef = useRef<HTMLOListElement | null>(null);
  const focusStepByOffset = useCallback(
    (fromIdx: number, offset: number) => {
      const targetIdx = fromIdx + offset;
      if (targetIdx < 0 || targetIdx >= flow.steps.length) return;
      const target = flow.steps[targetIdx];
      if (!target) return;
      const list = stepListRef.current;
      if (!list) return;
      const btn = list.querySelector<HTMLButtonElement>(
        `[data-testid="business-flow-step-${target.id}"]`,
      );
      btn?.focus();
    },
    [flow.steps],
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
        focusStepByOffset(idx, flow.steps.length - 1 - idx);
      }
    },
    [focusStepByOffset, flow.steps.length],
  );

  // 7차 PDCA: 플로우 전체 완료 축하 — 미완 → 완료 전이 시 1회만 토스트 + 컨페티.
  // 첫 마운트가 이미 완료 상태인 경우는 (이미 본 적 있음) 축하 생략.
  const flowComplete = isFlowComplete(flow.steps, currentStepId, completedSetFromServer);
  const [celebrating, setCelebrating] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const prevFlowCompleteRef = useRef<boolean | null>(null);

  useEffect(() => {
    const prev = prevFlowCompleteRef.current;
    prevFlowCompleteRef.current = flowComplete;
    // 첫 렌더(prev===null) 또는 이미 완료 상태 유지(prev===true) → skip
    if (prev !== false || !flowComplete) return;
    // 이미 축하한 적 있는 플로우면 다시 띄우지 않는다 (영구 1회).
    if (readCelebratedState(completedKey)) return;
    writeCelebratedState(completedKey);
    // 결정적 seed: flow.id 의 charCode 합 — Date.now (impure) 회피.
    const seed = flow.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    setConfetti(generateConfetti(seed));
    setCelebrating(true);
    toast.success(`🎉 ${flow.name} 완료!`, {
      description: '모든 단계를 마쳤습니다. 회고와 보고서로 마무리해 보세요.',
    });
    const confettiTimer = window.setTimeout(() => setConfetti([]), CONFETTI_DURATION_MS + 200);
    const glowTimer = window.setTimeout(() => setCelebrating(false), CELEBRATE_GLOW_DURATION_MS);
    return () => {
      window.clearTimeout(confettiTimer);
      window.clearTimeout(glowTimer);
    };
  }, [flowComplete, completedKey, flow.id, flow.name]);

  // 단계별 툴팁 노드 — 보이지 않게 렌더하되 aria-describedby 로 연결.
  const tooltipIdFor = useCallback(
    (stepId: string) => `${tooltipBaseId}-tooltip-${stepId}`,
    [tooltipBaseId],
  );

  const tooltipNodes = useMemo(
    () =>
      flow.steps.map((step) => (
        <span
          key={step.id}
          id={tooltipIdFor(step.id)}
          role="tooltip"
          className="sr-only"
        >
          {step.description} · {step.screen}
        </span>
      )),
    [flow.steps, tooltipIdFor],
  );

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
    <nav
      className={cn(
        'relative rounded-xl border border-fg-3/20 bg-bg-1 mb-4',
        celebrating && 'bf-celebrate',
        className,
      )}
      data-testid="business-flow-stepper"
      data-collapsed={collapsed ? 'true' : undefined}
      data-celebrating={celebrating ? 'true' : undefined}
      data-flow-complete={flowComplete ? 'true' : undefined}
      role="navigation"
      aria-label={`${flow.name} 단계 진행 표시`}
    >
      {/* 7차 PDCA: 컨페티 오버레이 — 절대 위치 + pointer-events:none. 라이브러리 미사용. */}
      {confetti.length > 0 && (
        <div
          className="absolute inset-0 overflow-visible pointer-events-none flex items-center justify-center z-10"
          aria-hidden
          data-testid="business-flow-confetti"
        >
          {confetti.map((piece) => (
            <span
              key={piece.id}
              className="bf-confetti-piece"
              style={{
                background: piece.color,
                ['--bf-x' as string]: `${piece.x}px`,
                ['--bf-y' as string]: `${piece.y}px`,
                ['--bf-r' as string]: `${piece.rotate}deg`,
                animationDelay: `${piece.delay}ms`,
              }}
            />
          ))}
        </div>
      )}
      {tooltipNodes}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-fg-3/15">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center gap-2 cursor-pointer text-fg-1 hover:text-accent-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
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
          className="ml-auto text-[11px] px-2.5 py-0.5 rounded-full border border-accent/30 text-accent-strong hover:bg-accent/10 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          data-testid="business-flow-ai-suggest"
        >
          {loading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
          AI 다음 단계
        </button>
      </div>
      {/* 6차 PDCA: overdue 경고 — 표준 일수 초과 시 amber 배너 */}
      {overdueInfo.overdue && currentStep && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/30 text-[11.5px] text-amber-700 dark:text-amber-400"
          data-testid="business-flow-overdue-warning"
          data-days-over={overdueInfo.daysOver}
        >
          <AlertTriangle size={11} className="shrink-0" />
          <span>
            <strong>{currentStep.label}</strong> 단계 표준 일수
            ({currentStep.expectedDays}일) 를 {overdueInfo.daysOver}일 초과했습니다.
            다음 단계로 진행하거나 AI 코칭을 받아보세요.
          </span>
        </div>
      )}
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
          <ol
            ref={stepListRef}
            className="flex items-center gap-1 flex-wrap"
            aria-label={`${flow.name} 단계 목록`}
          >
            {flow.steps.map((step, idx) => {
              const isCurrent = step.id === currentStepId;
              // 서버 동기화 모드일 때는 서버가 완료 표기한 단계 우선,
              // 그 외엔 idx < currentIdx (기존 동작 유지).
              const isPast = completedSetFromServer
                ? completedSetFromServer.has(step.id) && !isCurrent
                : currentIdx >= 0 && idx < currentIdx;
              const isFuture = currentIdx >= 0 && idx > currentIdx && !isPast;
              const tooltipId = tooltipIdFor(step.id);
              return (
                <li key={step.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onStepSelect?.(step)}
                    onKeyDown={(e) => handleStepKeyDown(e, idx)}
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
                    aria-label={`${idx + 1}/${flow.steps.length} ${step.label}${isCurrent ? ' · 현재' : isPast ? ' · 완료' : ''}`}
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
                  className="text-fg-3 hover:text-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
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
                    className="px-2 py-0.5 rounded-full bg-accent/10 text-accent-strong border border-accent/30 hover:bg-accent/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {suggestion.nextStep.label} → {suggestion.nextStep.action}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
