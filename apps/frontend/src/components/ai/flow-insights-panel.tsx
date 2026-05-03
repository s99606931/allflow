'use client';

/**
 * FlowInsightsPanel — 9차 PDCA: AI 플로우 인사이트 + 팀 병목 감지.
 *
 * 정책:
 *  - 단일 플로우(props.flowId, 기본: project-lifecycle)에 대한 단계별 진행 통계.
 *  - 병목 단계는 red ring 강조 + AI 한국어 2문장 설명 박스.
 *  - 데이터/네트워크 실패 시 silent fallback (위젯 비표시).
 *  - 5차 위젯(FlowProgressSummary) 위에 통합되도록 수직 컴팩트.
 */

import { Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FlowInsight, FlowInsightStep } from '@/lib/api/extended';
import { BUSINESS_FLOWS } from '@/lib/business-flows';
import { cn } from '@/lib/utils';

const QUERY_KEY = ['flow-insights'] as const;

export interface FlowInsightsPanelProps {
  /** 분석할 플로우 ID. 기본: project-lifecycle. */
  flowId?: string;
  className?: string;
}

function flowName(flowId: string): string {
  for (const f of Object.values(BUSINESS_FLOWS)) {
    if (f.id === flowId) return f.name;
  }
  return flowId;
}

export function FlowInsightsPanel({
  flowId = 'project-lifecycle',
  className,
}: FlowInsightsPanelProps) {
  const { data, isLoading, error } = useQuery<FlowInsight | null>({
    queryKey: [...QUERY_KEY, flowId] as const,
    queryFn: async () => {
      try {
        return await api.getBusinessFlowInsights(flowId);
      } catch {
        return null;
      }
    },
    staleTime: 30_000,
  });

  if (error || data === null) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-fg-3/20 bg-bg-1 p-4',
        className,
      )}
      data-testid="flow-insights-panel"
    >
      <Header isLoading={isLoading} flowId={flowId} totalMembers={data?.totalMembers ?? 0} />

      {isLoading && !data && (
        <p className="text-[12px] text-fg-3 mt-2">분석 중…</p>
      )}

      {data && (
        <>
          <StepStrip steps={data.steps} />
          <AiExplanationBox
            text={data.aiExplanation}
            hasBottleneck={data.bottleneckStepId !== null}
          />
        </>
      )}
    </div>
  );
}

interface HeaderProps {
  isLoading: boolean;
  flowId: string;
  totalMembers: number;
}

function Header({ isLoading, flowId, totalMembers }: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-fg">
        <Sparkles size={13} className="text-accent" />
        팀 플로우 인사이트
        <span className="text-fg-3 font-normal ml-1">· {flowName(flowId)}</span>
        <span className="text-fg-3 font-normal ml-1 tabular-nums">· {totalMembers}명</span>
      </div>
      {isLoading && <Loader2 size={12} className="animate-spin text-fg-3" />}
    </div>
  );
}

function StepStrip({ steps }: { steps: FlowInsightStep[] }) {
  return (
    <ol
      className="flex items-stretch gap-1.5 mb-3 overflow-x-auto"
      data-testid="flow-insights-steps"
    >
      {steps.map((step) => (
        <StepCard key={step.stepId} step={step} />
      ))}
    </ol>
  );
}

function StepCard({ step }: { step: FlowInsightStep }) {
  const isBottleneck = step.isBottleneck;
  const overduePct = Math.round(step.overdueRatio * 100);
  return (
    <li
      data-testid={`flow-insights-step-${step.stepId}`}
      data-bottleneck={isBottleneck ? 'true' : 'false'}
      className={cn(
        'flex-1 min-w-[120px] rounded-lg border px-2.5 py-2 transition-colors',
        isBottleneck
          ? 'border-red-500/60 ring-2 ring-red-500/40 bg-red-500/5'
          : 'border-fg-3/15 bg-bg-2',
      )}
    >
      <div className="flex items-center gap-1 text-[11px] font-semibold text-fg truncate">
        {isBottleneck && <AlertTriangle size={11} className="text-red-500 shrink-0" />}
        <span className="truncate">{step.label}</span>
      </div>
      <div className="mt-1 text-[10.5px] text-fg-3 tabular-nums leading-tight space-y-0.5">
        <div>인원 {step.memberCount}명</div>
        <div>평균 {step.avgDwellDays}일</div>
        <div className={cn(overduePct >= 50 ? 'text-red-500 font-semibold' : '')}>
          오버듀 {overduePct}%
        </div>
      </div>
    </li>
  );
}

interface AiExplanationBoxProps {
  text: string;
  hasBottleneck: boolean;
}

function AiExplanationBox({ text, hasBottleneck }: AiExplanationBoxProps) {
  return (
    <div
      className={cn(
        'rounded-lg px-3 py-2 text-[12px] leading-relaxed',
        hasBottleneck ? 'bg-red-500/8 text-fg' : 'bg-accent/5 text-fg-2',
      )}
      data-testid="flow-insights-ai-text"
    >
      <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-1">
        AI 분석
      </div>
      {text}
    </div>
  );
}
