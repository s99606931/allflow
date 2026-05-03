'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { BusinessFlowStep } from '@/lib/api/extended';

const COMPLETION_STORAGE_PREFIX = 'av:bf-stepper:completed:';
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

export interface ConfettiPiece {
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
export function isFlowComplete(
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

interface UseFlowCelebrationParams {
  flowId: string;
  flowName: string;
  flowComplete: boolean;
}

interface UseFlowCelebrationResult {
  celebrating: boolean;
  confetti: ConfettiPiece[];
}

/**
 * 7차 PDCA: 플로우 전체 완료 축하 — 미완 → 완료 전이 시 1회만 토스트 + 컨페티.
 * 첫 마운트가 이미 완료 상태인 경우는 (이미 본 적 있음) 축하 생략.
 * localStorage 가드로 영구 1회 보장.
 */
export function useFlowCelebration({
  flowId,
  flowName,
  flowComplete,
}: UseFlowCelebrationParams): UseFlowCelebrationResult {
  const completedKey = `${COMPLETION_STORAGE_PREFIX}${flowId}`;
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
    // 결정적 seed: flowId 의 charCode 합 — Date.now (impure) 회피.
    const seed = flowId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    setConfetti(generateConfetti(seed));
    setCelebrating(true);
    toast.success(`🎉 ${flowName} 완료!`, {
      description: '모든 단계를 마쳤습니다. 회고와 보고서로 마무리해 보세요.',
    });
    const confettiTimer = window.setTimeout(() => setConfetti([]), CONFETTI_DURATION_MS + 200);
    const glowTimer = window.setTimeout(() => setCelebrating(false), CELEBRATE_GLOW_DURATION_MS);
    return () => {
      window.clearTimeout(confettiTimer);
      window.clearTimeout(glowTimer);
    };
  }, [flowComplete, completedKey, flowId, flowName]);

  return { celebrating, confetti };
}
