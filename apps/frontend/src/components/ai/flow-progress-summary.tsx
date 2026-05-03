'use client';

/**
 * FlowProgressSummary — 5차 PDCA: 팀원의 비즈니스 플로우 진행 현황 위젯.
 *
 * 정책:
 *  - 대시보드용 요약 카드. 최대 N명 노출, 더 많으면 "+N명" 표기.
 *  - 서버사이드 집계 (GET /business-flows/team-progress) 한 번 호출 → 클라이언트 분류.
 *  - 인증/권한 실패 시 silent fallback (위젯 자체 비표시).
 *  - 단일 flowId 필터 옵션 — 미지정 시 전체 플로우 합산.
 *  - 완료된 항목(progressRatio === 1)은 "완료" 섹션, 그 외는 진행 중.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import type { TeamFlowProgressEntry } from '@/lib/api/extended';
import { BUSINESS_FLOWS } from '@/lib/business-flows';
import { Avatar } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

const QUERY_KEY = ['team-flow-progress'] as const;

interface FlowProgressSummaryProps {
  /** 단일 플로우 필터. 미지정 시 모든 플로우 합산. */
  flowId?: string;
  /** 한 카테고리에 표시할 최대 인원. 기본 6. */
  maxPerCategory?: number;
  className?: string;
}

interface FlowMeta {
  id: string;
  name: string;
  totalSteps: number;
}

function buildFlowMetaIndex(): Map<string, FlowMeta> {
  const idx = new Map<string, FlowMeta>();
  for (const flow of Object.values(BUSINESS_FLOWS)) {
    idx.set(flow.id, { id: flow.id, name: flow.name, totalSteps: flow.steps.length });
  }
  return idx;
}

// 사용자 → Avatar primitive 가 요구하는 { initials, color, name } 형태로 변환.
// User 모델의 initials/color 가 직접 노출되지 않으므로 안정 해시로 결정적 생성.
function toAvatarUser(user: {
  id: string;
  name: string;
  email: string;
}): { initials: string; color: string; name: string } {
  const trimmed = user.name.trim() || user.email;
  const parts = trimmed.split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
      : trimmed.slice(0, 2).toUpperCase();
  const palette = [
    'oklch(0.62 0.18 255)',
    'oklch(0.6 0.16 155)',
    'oklch(0.7 0.15 70)',
    'oklch(0.62 0.18 30)',
    'oklch(0.62 0.18 320)',
    'oklch(0.7 0.12 200)',
  ];
  let h = 0;
  for (let i = 0; i < user.id.length; i++) h = (h * 31 + user.id.charCodeAt(i)) | 0;
  const color = palette[Math.abs(h) % palette.length] ?? palette[0]!;
  return { initials: initials || '··', color, name: user.name };
}

export function FlowProgressSummary({
  flowId,
  maxPerCategory = 6,
  className,
}: FlowProgressSummaryProps) {
  const flowMetaIndex = useMemo(buildFlowMetaIndex, []);

  const { data, isLoading, error } = useQuery({
    queryKey: [...QUERY_KEY, flowId ?? 'all'] as const,
    queryFn: async () => {
      try {
        return await api.getTeamFlowProgress(flowId);
      } catch {
        return { team: [] as TeamFlowProgressEntry[] };
      }
    },
    staleTime: 30_000,
  });

  const team = data?.team ?? [];

  // 분류: 완료(ratio=1) vs 진행중. 진행중은 ratio desc 로 정렬.
  const { active, completed } = useMemo(() => {
    const a: TeamFlowProgressEntry[] = [];
    const c: TeamFlowProgressEntry[] = [];
    for (const entry of team) {
      if (entry.progressRatio >= 1) c.push(entry);
      else a.push(entry);
    }
    a.sort((x, y) => y.progressRatio - x.progressRatio);
    return { active: a, completed: c };
  }, [team]);

  if (error || (!isLoading && team.length === 0)) {
    return (
      <div
        className={cn(
          'rounded-xl border border-fg-3/20 bg-bg-1 p-4',
          className,
        )}
        data-testid="flow-progress-summary"
      >
        <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-fg mb-2">
          <Sparkles size={13} className="text-accent" />
          팀 플로우 진행 현황
        </div>
        <p className="text-[12px] text-fg-3">
          아직 팀원이 비즈니스 플로우를 시작하지 않았어요.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-fg-3/20 bg-bg-1 p-4',
        className,
      )}
      data-testid="flow-progress-summary"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-fg">
          <Sparkles size={13} className="text-accent" />
          팀 플로우 진행 현황
          {flowId && flowMetaIndex.get(flowId) && (
            <span className="text-fg-3 font-normal ml-1">
              · {flowMetaIndex.get(flowId)?.name}
            </span>
          )}
        </div>
        {isLoading && <Loader2 size={12} className="animate-spin text-fg-3" />}
      </div>

      {active.length > 0 && (
        <ProgressCategory
          label="진행 중"
          entries={active}
          flowMetaIndex={flowMetaIndex}
          maxPerCategory={maxPerCategory}
          tone="active"
        />
      )}
      {completed.length > 0 && (
        <ProgressCategory
          label="완료"
          entries={completed}
          flowMetaIndex={flowMetaIndex}
          maxPerCategory={maxPerCategory}
          tone="done"
        />
      )}
    </div>
  );
}

interface ProgressCategoryProps {
  label: string;
  entries: TeamFlowProgressEntry[];
  flowMetaIndex: Map<string, FlowMeta>;
  maxPerCategory: number;
  tone: 'active' | 'done';
}

function ProgressCategory({
  label,
  entries,
  flowMetaIndex,
  maxPerCategory,
  tone,
}: ProgressCategoryProps) {
  const visible = entries.slice(0, maxPerCategory);
  const overflow = entries.length - visible.length;
  return (
    <div className="space-y-1.5 mb-3 last:mb-0" data-testid={`flow-progress-${tone}`}>
      <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold">
        {label} <span className="text-fg-2 normal-case font-medium">· {entries.length}건</span>
      </div>
      <ul className="space-y-1">
        {visible.map((entry) => {
          const meta = flowMetaIndex.get(entry.flowId);
          const pct = Math.round(entry.progressRatio * 100);
          return (
            <li
              key={`${entry.user.id}::${entry.flowId}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-hover transition-colors"
              data-testid={`flow-progress-row-${entry.user.id}-${entry.flowId}`}
            >
              <Avatar user={toAvatarUser(entry.user)} size={22} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-fg truncate">
                  <strong className="font-semibold">{entry.user.name}</strong>{' '}
                  <span className="text-fg-2">— {meta?.name ?? entry.flowId}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1 rounded-full bg-fg-3/15 overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        tone === 'done' ? 'bg-success' : 'bg-accent',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10.5px] text-fg-3 tabular-nums w-9 text-right">
                    {pct}%
                  </span>
                </div>
              </div>
              {tone === 'done' && (
                <CheckCircle2 size={13} className="text-success shrink-0" />
              )}
            </li>
          );
        })}
      </ul>
      {overflow > 0 && (
        <Link
          href="/projects"
          className="block text-[11.5px] text-accent-strong hover:underline pl-2"
        >
          + {overflow}명 더 보기 →
        </Link>
      )}
    </div>
  );
}
