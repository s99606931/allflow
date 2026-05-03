'use client';

import { useMemo, useState } from 'react';
import { Card, CardBody, Avatar, Badge, Button, Progress, StatusDot } from '@/components/ui/primitives';
import type { IssueSev, IssuePrio } from '@/lib/types';
import { CheckCircle2, Filter, Loader2, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';
import { BusinessFlowStepper } from '@/components/ai/business-flow-stepper';
import { BUSINESS_FLOWS } from '@/lib/business-flows';
import { useRouter } from 'next/navigation';
import { useIssues, useIssueMutations, useMe } from '@/lib/hooks/use-data';
import { useAiStream } from '@/lib/hooks/use-ai';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import { IssueCreateDialog } from '@/components/dialogs/issue-create-dialog';
import { IssueEditDialog } from '@/components/dialogs/issue-edit-dialog';

const SEV_TONE: Record<IssueSev, 'danger' | 'warning' | 'info' | 'neutral'> = {
  critical: 'danger', high: 'warning', med: 'info', low: 'neutral',
};
const SEV_LABEL: Record<IssueSev, string> = {
  critical: 'Critical', high: 'High', med: 'Medium', low: 'Low',
};
const PRIO_COLOR: Record<IssuePrio, string> = {
  P0: 'oklch(0.62 0.2 25)', P1: 'oklch(0.72 0.18 50)', P2: 'oklch(0.7 0.13 220)', P3: 'oklch(0.7 0.01 250)',
};

type IssueFilter = '전체' | '내 이슈' | '🔥 Critical' | 'Open' | '⏰ SLA 임박';

export function IssuesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editIssue, setEditIssue] = useState<{ id: string; title: string; sev: string; prio: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<IssueFilter>('전체');
  const [search, setSearch] = useState('');
  const [aiDismissed, setAiDismissed] = useState(false);
  const [aiApproved, setAiApproved] = useState(false);
  const [classifyResult, setClassifyResult] = useState('');
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { streaming, streamComplete } = useAiStream();
  const { data: issues = [], isLoading, error } = useIssues();
  const { data: me } = useMe();
  const { remove: removeIssue } = useIssueMutations();
  const userMap = useUserMap();
  const p0Count = issues.filter(i => i.prio === 'P0' && (i.status === 'open' || i.status === 'in-progress')).length;
  const newCount = issues.filter(i => i.status === 'open').length;
  const slaAtRisk = issues.filter(i => i.slaPct >= 80).length;
  const resolvedCount = issues.filter(i => i.resolved).length;
  const resolvedPct = issues.length > 0 ? Math.round((resolvedCount / issues.length) * 100) : 0;
  const criticalCount = issues.filter(i => i.sev === 'critical' && i.status !== 'resolved').length;

  const displayed = useMemo(() => {
    return issues.filter(i => {
      if (activeFilter === '내 이슈') return i.assignee === me?.id;
      if (activeFilter === '🔥 Critical') return i.sev === 'critical';
      if (activeFilter === 'Open') return i.status === 'open';
      if (activeFilter === '⏰ SLA 임박') return i.slaPct >= 80;
      return true;
    }).filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase()));
  }, [issues, activeFilter, search, me]);

  const router = useRouter();
  const issueFlowStep =
    newCount > 0 ? 'open' :
    issues.some(i => i.status === 'in-progress') ? 'in-progress' :
    issues.some(i => i.status === 'in-review') ? 'verify' :
    resolvedCount === issues.length && issues.length > 0 ? 'closed' : 'triage';

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.issue}
        currentStepId={issueFlowStep}
        systemContext={`이슈 ${issues.length}건 (오픈 ${newCount}, 해결 ${resolvedCount})`}
        onStepSelect={(step) => router.push(step.screen)}
        enableServerSync
      />
      <AiGuideWidget
        systemContext={`이슈 트래커 — 전체 ${issues.length}건, P0 진행 중 ${p0Count}건, SLA 위험 ${slaAtRisk}건, 오픈 ${newCount}건`}
        hints={[
          slaAtRisk > 0 ? `SLA 임박 ${slaAtRisk}건 우선 처리 방법` : 'SLA 위반 위험 이슈 찾아줘',
          p0Count > 0 ? `P0 이슈 ${p0Count}건 대응 플레이북 알려줘` : '미배정 이슈 정리해줘',
          'Critical 이슈 대응방안 알려줘',
        ]}
        quickActions={[
          ...(p0Count > 0 ? [{ label: `P0 이슈 ${p0Count}건`, onClick: () => setActiveFilter('🔥 Critical') }] : []),
          ...(slaAtRisk > 0 ? [{ label: `SLA 임박 ${slaAtRisk}건`, onClick: () => setActiveFilter('⏰ SLA 임박') }] : []),
        ]}
      />
      <div className="grid grid-cols-6 gap-3">
        {[
          { l: '오픈 이슈', v: String(newCount), t: '' },
          { l: 'P0 진행중', v: String(p0Count), t: p0Count > 0 ? '!' : '' },
          { l: '전체', v: String(issues.length), t: '' },
          { l: 'SLA 임박', v: String(slaAtRisk), t: '' },
          { l: '해결률', v: `${resolvedPct}%`, t: '' },
          { l: 'Critical', v: String(criticalCount), t: criticalCount > 0 ? '!' : '' },
        ].map(m => (
          <Card key={m.l}>
            <CardBody className="!p-3.5">
              <div className="text-[11px] text-fg-2">{m.l}</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <div className="text-[22px] font-bold text-fg mono leading-none">{m.v}</div>
                <div className="text-[10.5px] mono text-fg-3">{m.t}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-bg-2 border border-border">
          {(['전체', '내 이슈', '🔥 Critical', 'Open', '⏰ SLA 임박'] as IssueFilter[]).map(c => (
            <button
              key={c}
              onClick={() => setActiveFilter(c)}
              className={`px-2.5 h-7 rounded text-[12px] font-medium transition-colors ${
                activeFilter === c ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2 hover:text-fg-1'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {activeFilter !== '전체' && (
          <button onClick={() => setActiveFilter('전체')} className="text-[11px] text-fg-3 hover:text-fg-1 underline">초기화</button>
        )}
        <Button variant="secondary" size="sm" onClick={() => { setActiveFilter('전체'); setSearch(''); }}><Filter size={13} /> 필터</Button>
        <div className="flex-1" />
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이슈 검색..."
            className="h-8 w-56 pl-8 pr-3 rounded-md bg-bg-elev border border-border text-[12.5px] focus:outline-none focus:border-accent"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={streaming || issues.length === 0}
          onClick={async () => {
            if (streaming) return;
            setClassifyResult('');
            setClassifyOpen(true);
            const summary = issues.slice(0, 20).map(i => `- [${i.prio}] ${i.title} (${i.status}, sev=${i.sev})`).join('\n');
            await streamComplete(
              `다음 이슈 목록을 분석하여 우선순위 조정 제안을 한국어로 3~5줄로 요약해주세요:\n\n${summary}`,
              delta => setClassifyResult(prev => prev + delta),
              () => {},
            );
          }}
        >
          {streaming && classifyOpen ? <><Loader2 size={13} className="animate-spin" /> 분류 중...</> : <><Sparkles size={13} /> AI 자동 분류</>}
        </Button>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Plus size={13} /> 새 이슈</Button>
        <IssueCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
        {editIssue && (
          <IssueEditDialog
            open={!!editIssue}
            onOpenChange={open => { if (!open) setEditIssue(null); }}
            issue={editIssue}
          />
        )}
      </div>

      {/* AI classify result */}
      {classifyOpen && classifyResult && (
        <div className="rounded-lg border border-accent/20 bg-accent-soft p-3.5 text-[12.5px] text-fg-1 leading-relaxed relative">
          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-accent-strong">
            <Sparkles size={11} /> AI 우선순위 분류 결과
          </div>
          {classifyResult}
          {streaming && <span className="inline-block w-1.5 h-3.5 bg-accent-strong ml-0.5 animate-pulse" />}
          <button type="button" onClick={() => setClassifyOpen(false)} className="absolute top-2.5 right-2.5 text-fg-3 hover:text-fg-1">
            <X size={13} />
          </button>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-soft border border-accent/30 text-[12.5px]">
          <span className="font-semibold text-accent-strong">{selectedIds.size}건 선택됨</span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toast(`선택한 이슈 ${selectedIds.size}건을 삭제하시겠습니까?`, {
              action: { label: '삭제', onClick: async () => { await Promise.all([...selectedIds].map(id => removeIssue.mutateAsync(id))); setSelectedIds(new Set()); } },
              cancel: '취소',
            })}
            disabled={removeIssue.isPending}
          >
            <Trash2 size={13} /> 일괄 삭제
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            선택 해제
          </Button>
        </div>
      )}

      {/* Issue list */}
      <Card>
        <div className="grid grid-cols-[36px_80px_1fr_140px_120px_90px_28px_28px_64px] gap-3 px-4 h-9 items-center text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold border-b border-border">
          <input type="checkbox" className="justify-self-center" checked={displayed.length > 0 && selectedIds.size === displayed.length} onChange={e => setSelectedIds(e.target.checked ? new Set(displayed.map(i => i.id)) : new Set())} />
          <div>ID</div>
          <div>제목</div>
          <div>상태</div>
          <div>SLA</div>
          <div>담당자</div>
          <div className="text-center">💬</div>
          <div className="text-center">🔗</div>
          <div className="text-right">생성</div>
        </div>
        {isLoading && <div className="px-4 py-12 text-center text-[12px] text-fg-3">불러오는 중...</div>}
        {error && <div className="px-4 py-12 text-center text-[12px] text-danger">이슈를 불러오지 못했습니다.</div>}
        {!isLoading && !error && displayed.length === 0 && (
          <div className="px-4 py-12 text-center space-y-2">
            <div className="text-[13px] font-semibold text-fg">이슈가 없습니다</div>
            <div className="text-[12px] text-fg-3 max-w-xs mx-auto">
              {activeFilter !== '전체' ? `"${activeFilter}" 필터에 해당하는 이슈가 없습니다. 필터를 해제해 보세요.` : '우상단 "새 이슈" 버튼을 눌러 이슈를 등록하세요.'}
            </div>
          </div>
        )}
        {displayed.map(iss => {
          const u = userMap.get(iss.assignee);
          return (
            <div
              key={iss.id}
              className="group relative grid grid-cols-[36px_80px_1fr_140px_120px_90px_28px_28px_64px] gap-3 px-4 py-2.5 items-center text-[12.5px] border-b border-border last:border-0 hover:bg-hover transition-colors cursor-pointer"
              onClick={() => setEditIssue({ id: iss.id, title: iss.title, sev: iss.sev, prio: iss.prio })}
            >
              <input type="checkbox" className="justify-self-center" checked={selectedIds.has(iss.id)} onClick={e => e.stopPropagation()} onChange={e => setSelectedIds(prev => { const next = new Set(prev); e.target.checked ? next.add(iss.id) : next.delete(iss.id); return next; })} />
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[10px] mono font-bold px-1.5 py-0.5 rounded text-white"
                  style={{ background: PRIO_COLOR[iss.prio] }}
                >
                  {iss.prio}
                </span>
                <span className="mono text-[11px] text-fg-3">{iss.id.split('-')[1]}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 h-4 rounded text-[10px] mono font-semibold text-white" style={{ background: iss.projColor }}>{iss.proj}</span>
                  <Badge tone={SEV_TONE[iss.sev]}>{SEV_LABEL[iss.sev]}</Badge>
                  <span className="text-fg truncate font-medium">{iss.title}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-fg-3">
                  {iss.tags.slice(0, 3).map(t => <span key={t} className="px-1 rounded bg-bg-2">#{t}</span>)}
                </div>
              </div>
              <div><StatusDot status={iss.status === 'open' ? 'todo' : iss.status === 'in-progress' ? 'doing' : iss.status === 'in-review' ? 'review' : 'done'} /></div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="mono text-fg-2">{iss.sla}</span>
                  <span className={`mono font-semibold ${iss.slaPct >= 80 ? 'text-danger' : iss.slaPct >= 60 ? 'text-warning' : 'text-fg-2'}`}>{iss.slaPct}%</span>
                </div>
                <Progress value={iss.slaPct} tone={iss.slaPct >= 80 ? 'danger' : iss.slaPct >= 60 ? 'warning' : 'accent'} />
              </div>
              <div>{u && <div className="flex items-center gap-1.5"><Avatar user={u} size={20} /><span className="text-[11.5px] text-fg-1 truncate">{u.name}</span></div>}</div>
              <div className="text-center text-[11px] text-fg-2 mono">{iss.comments}</div>
              <div className="text-center text-[11px] text-fg-2 mono">{iss.linked || '-'}</div>
              <div className="text-right text-[11px] text-fg-3">{iss.created}</div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toast(`"${iss.title}" 이슈를 삭제하시겠습니까?`, { action: { label: '삭제', onClick: () => removeIssue.mutate(iss.id) }, cancel: '취소' }); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 text-fg-3 hover:text-danger hover:bg-bg-2 transition-opacity"
                aria-label="이슈 삭제"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </Card>

      {/* AI suggestion — derives from real issue data */}
      {!aiDismissed && (() => {
        const urgent = issues
          .filter(i => i.status !== 'resolved' && i.slaPct >= 80)
          .sort((a, b) => b.slaPct - a.slaPct)[0];
        if (!urgent) return null;
        const shortId = urgent.id.includes('-') ? urgent.id.split('-').slice(-1)[0] : urgent.id;
        return (
          <Card className="!bg-accent-soft border-accent/20">
            <CardBody className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-accent text-accent-fg grid place-items-center shrink-0"><Sparkles size={14} /></div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-fg">AI 권장 액션 — {urgent.title} (#{shortId})</div>
                <p className="text-[12.5px] text-fg-1 mt-1 leading-relaxed">
                  <strong>{urgent.prio}</strong> 이슈가 SLA <strong>{urgent.slaPct}%</strong> 도달. 즉각 대응이 필요합니다.
                  {slaAtRisk > 1 && ` 추가로 ${slaAtRisk - 1}개 이슈가 SLA 위험 상태입니다.`}
                </p>
                {aiApproved ? (
                  <div className="flex items-center gap-1.5 mt-2.5 text-[12px] text-success font-medium">
                    <CheckCircle2 size={13} /> 에스컬레이션 완료
                  </div>
                ) : (
                  <div className="flex gap-2 mt-2.5">
                    <Button variant="primary" size="sm" onClick={() => setAiApproved(true)}>에스컬레이션</Button>
                    <Button variant="ghost" size="sm" onClick={() => setAiDismissed(true)}>무시</Button>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        );
      })()}
    </div>
  );
}
