'use client';

/**
 * BusinessFlowOnboarding — 6차 PDCA: 첫 방문 사용자 온보딩 오버레이.
 *
 * 동기:
 *  초급 사용자가 BusinessFlowStepper 를 처음 봤을 때 "이게 뭐고 어떻게 쓰는지"
 *  를 1회성 popover 로 안내한다. localStorage `av:bf-onboarding:done` 키로
 *  중복 방지 — 한 번 닫으면 다시는 보이지 않는다.
 *
 * 정책:
 *  - 1회성 — 동일 브라우저에서 한 번만 표시.
 *  - dismissible — "확인" 버튼 또는 X 버튼으로 닫기.
 *  - non-blocking — 페이지 인터랙션을 막지 않는 popover (modal 아님).
 *  - SSR safe — 마운트 후 localStorage 읽기 (hydration mismatch 회피).
 */

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ONBOARDING_KEY = 'av:bf-onboarding:done';

interface BusinessFlowOnboardingProps {
  /** 안내 표시 대상 영역의 anchor selector (선택). 미지정 시 화면 중앙. */
  anchorTestId?: string;
  className?: string;
}

function isOnboardingDone(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    return true; // localStorage 비활성 시 안내를 띄우지 않는다 (재방문 가짜 안내 방지).
  }
}

function markOnboardingDone(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    // 무시 — 다음 방문 시 한 번 더 표시되어도 동작에는 문제 없음.
  }
}

export function BusinessFlowOnboarding({
  anchorTestId,
  className,
}: BusinessFlowOnboardingProps) {
  // SSR 에서는 항상 false 로 시작 → hydration mismatch 회피.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOnboardingDone()) {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    markOnboardingDone();
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="bf-onboarding-title"
      data-testid="business-flow-onboarding"
      data-anchor={anchorTestId}
      className={cn(
        'fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border border-accent/40',
        'bg-bg-1 shadow-xl p-4 text-fg-1',
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-accent/10 p-2 shrink-0">
          <Sparkles size={16} className="text-accent-strong" />
        </div>
        <div className="flex-1">
          <h3
            id="bf-onboarding-title"
            className="text-[13px] font-semibold leading-tight"
          >
            업무 흐름 시각화 안내
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-fg-2">
            화면 상단의 단계별 progress bar 는 현재 작업이 전체 업무 흐름의 어디에
            있는지 보여줍니다.
          </p>
          <ul className="mt-2 space-y-1.5 text-[11.5px] text-fg-2">
            <li className="flex items-start gap-1.5">
              <CheckCircle2
                size={11}
                className="text-accent-strong shrink-0 mt-0.5"
              />
              <span>각 단계를 클릭하면 해당 화면으로 이동합니다.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2
                size={11}
                className="text-accent-strong shrink-0 mt-0.5"
              />
              <span>
                <strong>AI 다음 단계</strong> 버튼으로 즉시 다음 액션을
                추천받을 수 있습니다.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2
                size={11}
                className="text-accent-strong shrink-0 mt-0.5"
              />
              <span>표준 일수를 초과한 단계는 amber 색상으로 경고됩니다.</span>
            </li>
          </ul>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 w-full px-3 py-1.5 rounded-md bg-accent text-accent-fg text-[12px] font-medium hover:bg-accent/90 transition-colors cursor-pointer"
            data-testid="business-flow-onboarding-dismiss"
          >
            확인했어요
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-fg-3 hover:text-fg-1 transition-colors shrink-0"
          aria-label="안내 닫기"
          data-testid="business-flow-onboarding-close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
