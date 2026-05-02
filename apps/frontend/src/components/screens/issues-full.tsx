'use client';

import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Card, CardBody, CardHeader, CardTitle, Avatar, Badge, Button, Progress, StatusDot } from '@/components/ui/primitives';
import { IssueCreateDialog } from '@/components/dialogs/issue-create-dialog';
import { IssueEditDialog } from '@/components/dialogs/issue-edit-dialog';
import { useIssues, useIssueMutations, useMe } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import type { Issue, IssueSev, IssuePrio, IssueStatus } from '@/lib/schemas';
import { Plus, Search, Sparkles, LayoutList, KanbanSquare, Clock, BarChart3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';

const SEV_TONE: Record<IssueSev, 'danger' | 'warning' | 'info' | 'neutral'> = {
  critical: 'danger', high: 'warning', med: 'info', low: 'neutral',
};
const SEV_LABEL: Record<IssueSev, string> = {
  critical: 'Critical', high: 'High', med: 'Medium', low: 'Low',
};
const PRIO_COLOR: Record<IssuePrio, string> = {
  P0: 'oklch(0.62 0.2 25)', P1: 'oklch(0.72 0.18 50)', P2: 'oklch(0.7 0.13 220)', P3: 'oklch(0.7 0.01 250)',
};

const COLUMNS = [
  { id: 'open', label: 'Open', accent: 'oklch(0.7 0.01 250)' },
  { id: 'in-progress', label: '진행중', accent: 'oklch(0.62 0.18 255)' },
  { id: 'in-review', label: '검토', accent: 'oklch(0.7 0.15 70)' },
  { id: 'resolved', label: '해결됨', accent: 'oklch(0.65 0.16 155)' },
] as const;

const SLA_POLICY = [
  { prio: 'P0', firstResp: '15분', resolve: '4h', escalate: '12h' },
  { prio: 'P1', firstResp: '1h', resolve: '8h', escalate: '3d' },
  { prio: 'P2', firstResp: '4h', resolve: '1d', escalate: '5d' },
  { prio: 'P3', firstResp: '1d', resolve: '3d', escalate: '7d' },
];

const HOTSPOT_LIMIT = 5;

function deriveHotspots(issues: Issue[]) {
  const byProj = new Map<string, number>();
  for (const iss of issues) {
    byProj.set(iss.proj, (byProj.get(iss.proj) ?? 0) + 1);
  }
  const sorted = Array.from(byProj.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, HOTSPOT_LIMIT);
  const max = sorted[0]?.[1] ?? 1;
  return sorted.map(([module, count]) => ({ module, count, max }));
}

export function IssuesPageFull() {
  const [tab, setTab] = useState('list');
  const [createOpen, setCreateOpen] = useState(false);
  const [listFilter, setListFilter] = useState(0);
  const [listSearch, setListSearch] = useState('');
  const [aiSuggestionDismissed, setAiSuggestionDismissed] = useState(false);
  const { data: issues = [] } = useIssues();
  const userMap = useUserMap();
  const stats = computeStats(issues);

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <AiGuideWidget
        systemContext={`이슈 심층 분석 — 전체 ${issues.length}건, P0 ${stats.p0}건, SLA 준수 ${stats.slaRate}%, 해결 ${stats.resolvedCount}건`}
        hints={[
          stats.p0 > 0 ? `P0 진행중 ${stats.p0}건 긴급 대응 플레이북 알려줘` : 'SLA 정책 최적화 제안해줘',
          stats.slaRate < 80 ? `SLA 준수율 ${stats.slaRate}% 개선 방법 알려줘` : '이슈 트렌드 분석해줘',
          stats.unassigned > 0 ? `미할당 ${stats.unassigned}건 담당자 배정 도와줘` : 'Critical 이슈 예방 전략 알려줘',
        ]}
        quickActions={[
          { label: '새 이슈', onClick: () => setCreateOpen(true) },
          ...(stats.p0 > 0 ? [{ label: `P0 ${stats.p0}건`, onClick: () => { setTab('list'); setListFilter(0); } }] : []),
        ]}
      />
      {/* KPI strip */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { l: '전체', v: stats.recent, t: '' },
          { l: 'P0 진행중', v: stats.p0, t: stats.p0 > 0 ? '!' : '—', danger: stats.p0 > 0 },
          { l: '미할당', v: stats.unassigned, t: '' },
          { l: '해결 완료', v: stats.resolvedCount, t: '' },
          { l: 'SLA 준수', v: `${stats.slaRate}%`, t: '' },
          { l: 'Critical 해결', v: stats.criticalResolved, t: '' },
        ].map(m => (
          <Card key={m.l}>
            <CardBody className="!p-3.5">
              <div className="text-[11px] text-fg-2">{m.l}</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <div className={`text-[22px] font-bold mono leading-none ${m.danger ? 'text-danger' : 'text-fg'}`}>{m.v}</div>
                <div className="text-[10.5px] mono text-fg-3">{m.t}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List className="flex items-center gap-1 border-b border-border">
          {[
            { id: 'list', label: '리스트', icon: LayoutList },
            { id: 'board', label: '보드', icon: KanbanSquare },
            { id: 'sla', label: 'SLA', icon: Clock },
            { id: 'analytics', label: '분석', icon: BarChart3 },
          ].map(t => (
            <Tabs.Trigger
              key={t.id}
              value={t.id}
              className="px-3 h-10 text-[12.5px] font-medium text-fg-2 hover:text-fg-1 inline-flex items-center gap-1.5 border-b-2 border-transparent data-[state=active]:text-fg data-[state=active]:border-accent transition-colors"
            >
              <t.icon size={13} /> {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* LIST */}
        <Tabs.Content value="list" className="pt-4 space-y-4 outline-none">
          <Toolbar onCreate={() => setCreateOpen(true)} activeFilter={listFilter} onFilterChange={setListFilter} search={listSearch} onSearchChange={setListSearch} />
          <IssueList filter={listFilter} search={listSearch} />
          {!aiSuggestionDismissed && <AISuggestion issues={issues} onDismiss={() => setAiSuggestionDismissed(true)} />}
        </Tabs.Content>

        {/* BOARD */}
        <Tabs.Content value="board" className="pt-4 outline-none">
          <div className="grid grid-cols-4 gap-3">
            {COLUMNS.map(col => {
              const colIssues = issues.filter(i => i.status === col.id);
              return (
                <div key={col.id} className="bg-bg-1 rounded-lg border border-border min-h-[400px]">
                  <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: col.accent }} />
                    <span className="text-[12.5px] font-semibold text-fg">{col.label}</span>
                    <span className="text-[11px] mono text-fg-3 ml-auto">{colIssues.length}</span>
                  </div>
                  <div className="p-2 space-y-2">
                    {colIssues.map(iss => <BoardCard key={iss.id} issue={iss} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </Tabs.Content>

        {/* SLA */}
        <Tabs.Content value="sla" className="pt-4 grid grid-cols-3 gap-4 outline-none">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>SLA 임박 이슈</CardTitle>
              <Badge tone="warning">{issues.filter(i => i.slaPct >= 60 && !i.resolved).length}건</Badge>
            </CardHeader>
            <CardBody className="!p-0">
              {[...issues].filter(i => !i.resolved).sort((a, b) => b.slaPct - a.slaPct).map(iss => {
                const u = userMap.get(iss.assignee);
                return (
                  <div key={iss.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0">
                    <span className="text-[10px] mono font-bold px-1.5 py-0.5 rounded text-white" style={{ background: PRIO_COLOR[iss.prio] }}>{iss.prio}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium text-fg truncate">{iss.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={iss.slaPct} tone={iss.slaPct >= 80 ? 'danger' : iss.slaPct >= 60 ? 'warning' : 'accent'} className="flex-1 max-w-[200px]" />
                        <span className={`text-[11px] mono font-semibold ${iss.slaPct >= 80 ? 'text-danger' : 'text-fg-2'}`}>{iss.slaPct}%</span>
                      </div>
                    </div>
                    {u && <Avatar user={u} size={22} />}
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>SLA 정책</CardTitle></CardHeader>
              <CardBody className="!p-0">
                <div className="grid grid-cols-4 gap-2 px-4 py-2 text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold border-b border-border">
                  <div>우선순위</div><div>1차 응답</div><div>해결</div><div>에스컬레이션</div>
                </div>
                {SLA_POLICY.map(p => (
                  <div key={p.prio} className="grid grid-cols-4 gap-2 px-4 py-2 text-[12px] border-b border-border last:border-0">
                    <span className="text-[10px] mono font-bold px-1.5 py-0.5 rounded text-white w-fit" style={{ background: PRIO_COLOR[p.prio as IssuePrio] }}>{p.prio}</span>
                    <span className="mono text-fg-1">{p.firstResp}</span>
                    <span className="mono text-fg-1">{p.resolve}</span>
                    <span className="mono text-fg-2">{p.escalate}</span>
                  </div>
                ))}
              </CardBody>
            </Card>

            <SlaAiActionCard issues={issues} />
          </div>
        </Tabs.Content>

        {/* ANALYTICS */}
        <Tabs.Content value="analytics" className="pt-4 grid grid-cols-3 gap-4 outline-none">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>30일 추이</CardTitle>
              <div className="flex gap-3 text-[11px]">
                <Legend color="oklch(0.62 0.2 25)" label="신규" />
                <Legend color="oklch(0.65 0.16 155)" label="해결" />
                <Legend color="oklch(0.62 0.18 255)" label="누적" />
              </div>
            </CardHeader>
            <CardBody>
              <TrendChart issues={issues} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>최다 발생 프로젝트 Top 5</CardTitle></CardHeader>
            <CardBody className="space-y-2.5">
              {(() => {
                const hotspots = deriveHotspots(issues);
                if (hotspots.length === 0) {
                  return (
                    <div className="text-[12px] text-fg-3 py-4 text-center">
                      이슈 데이터가 없습니다.
                    </div>
                  );
                }
                return hotspots.map(h => (
                  <div key={h.module} className="flex items-center gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12.5px] font-medium text-fg truncate mono">{h.module}</span>
                      </div>
                      <Progress value={(h.count / h.max) * 100} className="mt-1.5" tone="accent" />
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[14px] mono font-bold text-fg">{h.count}</div>
                    </div>
                  </div>
                ));
              })()}
            </CardBody>
          </Card>

          <Card className="col-span-3">
            <CardHeader><CardTitle>해결 속도 리더보드</CardTitle></CardHeader>
            <CardBody>
              {(() => {
                const resolvedByAssignee = new Map<string, { count: number; totalSlaPct: number }>();
                for (const iss of issues) {
                  if (!iss.resolved || !iss.assignee) continue;
                  const cur = resolvedByAssignee.get(iss.assignee) ?? { count: 0, totalSlaPct: 0 };
                  resolvedByAssignee.set(iss.assignee, { count: cur.count + 1, totalSlaPct: cur.totalSlaPct + iss.slaPct });
                }
                const board = Array.from(resolvedByAssignee.entries())
                  .map(([id, { count, totalSlaPct }]) => ({ id, count, avgSlaPct: Math.round(totalSlaPct / count) }))
                  .sort((a, b) => b.avgSlaPct - a.avgSlaPct || b.count - a.count)
                  .slice(0, 5);
                if (board.length === 0) {
                  return <div className="py-4 text-center text-[12px] text-fg-3">해결된 이슈가 없습니다.</div>;
                }
                return (
                  <div className="grid grid-cols-5 gap-3">
                    {board.map(({ id, count, avgSlaPct }, i) => {
                      const u = userMap.get(id);
                      if (!u) return null;
                      return (
                        <div key={id} className="rounded-lg border border-border p-3 text-center">
                          <div className="text-[10px] mono text-fg-3">#{i + 1}</div>
                          <Avatar user={u} size={36} className="mx-auto mt-1" />
                          <div className="text-[12.5px] font-semibold text-fg mt-1.5 truncate">{u.name}</div>
                          <div className="text-[18px] font-bold mono text-accent-strong mt-1">{count}건</div>
                          <div className="text-[10.5px] text-fg-3 mt-0.5">해결 · SLA {avgSlaPct}%</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardBody>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
      <IssueCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

const FILTER_CHIPS = ['전체', '내 이슈', '🔥 Critical', 'Open', '⏰ SLA 임박'] as const;

function Toolbar({ onCreate, activeFilter, onFilterChange, search, onSearchChange }: {
  onCreate: () => void;
  activeFilter: number;
  onFilterChange: (i: number) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 p-0.5 rounded-md bg-bg-2 border border-border">
        {FILTER_CHIPS.map((c, i) => (
          <button key={c} onClick={() => onFilterChange(i)} className={`px-2.5 h-7 rounded text-[12px] font-medium transition-colors ${i === activeFilter ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2 hover:text-fg-1'}`}>{c}</button>
        ))}
      </div>
      <div className="flex-1" />
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
        <input value={search} onChange={e => onSearchChange(e.target.value)} placeholder="이슈 검색..." className="h-8 w-56 pl-8 pr-3 rounded-md bg-bg-elev border border-border text-[12.5px] focus:outline-none focus:border-accent" />
      </div>
      <Button variant="primary" size="sm" onClick={onCreate}><Plus size={13} /> 새 이슈</Button>
    </div>
  );
}

function IssueList({ filter, search }: { filter: number; search: string }) {
  const { data: allIssues = [] } = useIssues();
  const { data: me } = useMe();
  const userMap = useUserMap();
  const { remove } = useIssueMutations();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editIssue, setEditIssue] = useState<Issue | null>(null);
  const issues = allIssues.filter(iss => {
    if (search && !iss.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 1) return iss.assignee === me?.id;
    if (filter === 2) return iss.sev === 'critical';
    if (filter === 3) return iss.status === 'open';
    return true;
  });
  return (
    <>
    <Card>
      <div className="grid grid-cols-[36px_80px_1fr_140px_120px_90px_64px] gap-3 px-4 h-9 items-center text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold border-b border-border">
        <input type="checkbox" className="justify-self-center" checked={issues.length > 0 && selectedIds.size === issues.length} onChange={e => setSelectedIds(e.target.checked ? new Set(issues.map(i => i.id)) : new Set())} />
        <div>ID</div><div>제목</div><div>상태</div><div>SLA</div><div>담당자</div><div className="text-right">생성</div>
      </div>
      {issues.map(iss => {
        const u = userMap.get(iss.assignee);
        return (
          <div key={iss.id} className="group relative grid grid-cols-[36px_80px_1fr_140px_120px_90px_64px] gap-3 px-4 py-2.5 items-center text-[12.5px] border-b border-border last:border-0 hover:bg-hover transition-colors cursor-pointer">
            <input type="checkbox" className="justify-self-center" checked={selectedIds.has(iss.id)} onClick={e => e.stopPropagation()} onChange={e => setSelectedIds(prev => { const next = new Set(prev); e.target.checked ? next.add(iss.id) : next.delete(iss.id); return next; })} />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] mono font-bold px-1.5 py-0.5 rounded text-white" style={{ background: PRIO_COLOR[iss.prio] }}>{iss.prio}</span>
              <span className="mono text-[11px] text-fg-3">{iss.id.split('-')[1]}</span>
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <span className="px-1.5 h-4 rounded text-[10px] mono font-semibold text-white" style={{ background: iss.projColor }}>{iss.proj}</span>
              <Badge tone={SEV_TONE[iss.sev]}>{SEV_LABEL[iss.sev]}</Badge>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setEditIssue(iss); }}
                className="text-fg truncate font-medium hover:underline hover:text-accent text-left"
              >
                {iss.title}
              </button>
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
            <div className="text-right text-[11px] text-fg-3">{iss.created}</div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); toast(`"${iss.title}" 이슈를 삭제하시겠습니까?`, { action: { label: '삭제', onClick: () => remove.mutate(iss.id) }, cancel: '취소' }); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 text-fg-3 hover:text-danger hover:bg-bg-2 transition-opacity"
              aria-label="이슈 삭제"
            >
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
    </Card>
    {editIssue && (
      <IssueEditDialog open={!!editIssue} onOpenChange={o => !o && setEditIssue(null)} issue={editIssue} />
    )}
    </>
  );
}

function BoardCard({ issue }: { issue: Issue }) {
  const userMap = useUserMap();
  const u = userMap.get(issue.assignee);
  const { transition } = useIssueMutations();
  return (
    <div className="rounded-md border border-border bg-bg-elev p-2.5 hover:shadow-md hover:border-border-strong transition-all">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] mono font-bold px-1.5 py-0.5 rounded text-white" style={{ background: PRIO_COLOR[issue.prio] }}>{issue.prio}</span>
        <span className="px-1.5 h-4 rounded text-[10px] mono font-semibold text-white" style={{ background: issue.projColor }}>{issue.proj}</span>
        <span className="mono text-[10.5px] text-fg-3 ml-auto">{issue.id.split('-')[1]}</span>
      </div>
      <div className="text-[12px] font-medium text-fg leading-snug mb-2">{issue.title}</div>
      <div className="flex items-center gap-1.5">
        <Badge tone={SEV_TONE[issue.sev]}>{SEV_LABEL[issue.sev]}</Badge>
        <div className="flex-1" />
        {u && <Avatar user={u} size={18} />}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Progress value={issue.slaPct} tone={issue.slaPct >= 80 ? 'danger' : issue.slaPct >= 60 ? 'warning' : 'accent'} className="flex-1" />
        <span className={`text-[10.5px] mono font-semibold ${issue.slaPct >= 80 ? 'text-danger' : 'text-fg-2'}`}>{issue.slaPct}%</span>
      </div>
      <div className="mt-2">
        <select
          aria-label="상태 변경"
          value={issue.status}
          disabled={transition.isPending}
          onChange={(e) => transition.mutate({
            id: issue.id,
            input: { status: e.target.value as IssueStatus },
          })}
          className="w-full h-6 text-[11px] rounded bg-bg-1 border border-border px-1.5 focus:outline-none focus:border-accent"
        >
          <option value="open">Open</option>
          <option value="in-progress">진행중</option>
          <option value="in-review">검토</option>
          <option value="resolved">해결됨</option>
        </select>
      </div>
    </div>
  );
}

function computeStats(issues: Issue[]) {
  const resolved = issues.filter(i => i.status === 'resolved');
  const open = issues.filter(i => i.status !== 'resolved');
  const slaCompliant = open.length > 0 ? open.filter(i => i.slaPct < 80).length : 0;
  const slaRate = open.length > 0 ? Math.round((slaCompliant / open.length) * 100) : 100;
  const criticalResolved = resolved.filter(i => i.sev === 'critical').length;
  return {
    recent: issues.length,
    p0: issues.filter(i => i.prio === 'P0' && i.status !== 'resolved').length,
    unassigned: issues.filter(i => !i.assignee).length,
    resolvedCount: resolved.length,
    slaRate,
    criticalResolved,
  };
}

function nextEscalationStatus(status: IssueStatus): IssueStatus {
  if (status === 'open') return 'in-progress';
  if (status === 'in-progress') return 'in-review';
  return 'in-review';
}

function AISuggestion({ issues, onDismiss }: { issues: Issue[]; onDismiss: () => void }) {
  const { transition } = useIssueMutations();
  const urgent = issues
    .filter(i => i.status !== 'resolved' && i.slaPct >= 80)
    .sort((a, b) => b.slaPct - a.slaPct)[0];
  if (!urgent) return null;
  const shortId = urgent.id.includes('-') ? urgent.id.split('-').slice(-1)[0] : urgent.id;
  const escalate = async () => {
    await transition.mutateAsync({
      id: urgent.id,
      input: { status: nextEscalationStatus(urgent.status), comment: `에스컬레이션: SLA ${urgent.slaPct}% 도달 — 즉각 대응 필요` },
    });
    toast.success(`#${shortId} 에스컬레이션 완료 — 상태 업데이트됨`);
    onDismiss();
  };
  return (
    <Card className="!bg-accent-soft border-accent/20">
      <CardBody className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-md bg-accent text-accent-fg grid place-items-center shrink-0"><Sparkles size={14} /></div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-fg">AI 권장 액션 — {urgent.title} (#{shortId})</div>
          <p className="text-[12.5px] text-fg-1 mt-1 leading-relaxed">
            <strong>{urgent.prio}</strong> 이슈가 SLA {urgent.slaPct}% 도달. 즉각 대응이 필요합니다.
            담당자 확인 및 에스컬레이션을 권장합니다.
          </p>
          <div className="flex gap-2 mt-2.5">
            <Button variant="primary" size="sm" disabled={transition.isPending} onClick={escalate}>에스컬레이션</Button>
            <Button variant="ghost" size="sm" onClick={onDismiss}>무시</Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function SlaAiActionCard({ issues }: { issues: Issue[] }) {
  const { transition } = useIssueMutations();
  const urgent = issues
    .filter(i => i.status !== 'resolved' && i.slaPct >= 80)
    .sort((a, b) => b.slaPct - a.slaPct)[0];
  if (!urgent) {
    return (
      <Card className="!bg-success-soft border-success/20">
        <CardBody className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-success" />
            <div className="text-[12.5px] font-semibold text-fg">AI 권장 액션</div>
          </div>
          <p className="text-[12px] text-fg-1 leading-relaxed">현재 SLA 위험 이슈가 없습니다. 예방적 모니터링을 유지하세요.</p>
        </CardBody>
      </Card>
    );
  }
  const shortId = urgent.id.includes('-') ? urgent.id.split('-').slice(-1)[0] : urgent.id;
  const escalate = () => transition.mutate({
    id: urgent.id,
    input: { status: nextEscalationStatus(urgent.status), comment: `에스컬레이션: SLA ${urgent.slaPct}% 도달 — 즉각 대응 필요` },
  }, { onSuccess: () => toast.success(`#${shortId} 에스컬레이션 완료`) });
  return (
    <Card className="!bg-accent-soft border-accent/20">
      <CardBody className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent-strong" />
          <div className="text-[12.5px] font-semibold text-fg">AI 권장 액션</div>
        </div>
        <p className="text-[12px] text-fg-1 leading-relaxed">
          <strong>#{shortId}</strong> ({urgent.prio}) SLA {urgent.slaPct}% 도달. 즉각 대응 및 에스컬레이션을 권장합니다.
        </p>
        <Button variant="primary" size="sm" disabled={transition.isPending} onClick={escalate}>에스컬레이션</Button>
      </CardBody>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1 text-fg-2"><span className="w-2 h-2 rounded-full" style={{ background: color }} />{label}</span>;
}

function TrendChart({ issues }: { issues: Issue[] }) {
  const DAYS = 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const newPerDay = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    const dateStr = d.toISOString().slice(0, 10);
    return issues.filter(iss => iss.created?.slice(0, 10) === dateStr).length;
  });

  const resolvedPerDay = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    const dateStr = d.toISOString().slice(0, 10);
    return issues.filter(iss => iss.resolved && iss.created?.slice(0, 10) === dateStr).length;
  });

  const cum: number[] = [];
  let acc = issues.filter(iss => {
    const d = new Date(today); d.setDate(d.getDate() - DAYS);
    return !iss.resolved && iss.created && new Date(iss.created) < d;
  }).length;
  for (let i = 0; i < DAYS; i++) { acc += newPerDay[i] - resolvedPerDay[i]; cum.push(Math.max(0, acc)); }

  const max = Math.max(...newPerDay, ...resolvedPerDay, ...cum, 1);
  const W = 600, H = 180, P = 20;
  const xs = (i: number) => P + (i / (DAYS - 1)) * (W - 2 * P);
  const ys = (v: number) => H - P - (v / max) * (H - 2 * P);
  const line = (arr: number[]) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs(i)},${ys(v)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {[0.25, 0.5, 0.75, 1].map(g => (
        <line key={g} x1={P} x2={W - P} y1={H - P - g * (H - 2 * P)} y2={H - P - g * (H - 2 * P)}
          stroke="var(--color-border)" strokeDasharray="2 4" />
      ))}
      <path d={line(cum)} fill="none" stroke="oklch(0.62 0.18 255)" strokeWidth="2" />
      <path d={line(newPerDay)} fill="none" stroke="oklch(0.62 0.2 25)" strokeWidth="1.5" strokeOpacity="0.8" />
      <path d={line(resolvedPerDay)} fill="none" stroke="oklch(0.65 0.16 155)" strokeWidth="1.5" strokeOpacity="0.8" />
    </svg>
  );
}
