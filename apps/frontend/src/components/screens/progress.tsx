'use client';

import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { ProjectCreateDialog } from '@/components/dialogs/project-create-dialog';
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Progress } from '@/components/ui/primitives';
import { useProjects, useProjectMutations } from '@/lib/hooks/use-data';
import type { Project, StatusKey } from '@/lib/schemas';
import { LayoutGrid, GanttChart, HeartPulse, Plus } from 'lucide-react';


const PROJECT_STATUS_OPTIONS: { value: StatusKey; label: string }[] = [
  { value: 'todo', label: '대기' },
  { value: 'doing', label: '진행' },
  { value: 'review', label: '검토' },
  { value: 'done', label: '완료' },
  { value: 'blocked', label: '차단' },
];

type HealthMetric = { metric: string; score: number | null; hint?: string };

function deriveHealth(projects: Project[]): HealthMetric[] {
  if (projects.length === 0) {
    return [
      { metric: '일정', score: null, hint: '프로젝트 없음' },
      { metric: '범위', score: null, hint: '프로젝트 없음' },
      { metric: '안정성', score: null, hint: '프로젝트 없음' },
    ];
  }
  // 일정: 진행 또는 완료 상태인 프로젝트 비율
  const onTrack = projects.filter(p => p.status === 'doing' || p.status === 'done').length;
  const schedule = Math.round((onTrack / projects.length) * 100);
  // 범위: 모든 프로젝트의 누적 task done 비율
  const totals = projects.reduce(
    (acc, p) => ({ total: acc.total + p.tasks.total, done: acc.done + p.tasks.done }),
    { total: 0, done: 0 },
  );
  const scope = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;
  // 안정성: 차단되지 않은 프로젝트 비율
  const notBlocked = projects.filter(p => p.status !== 'blocked').length;
  const stability = Math.round((notBlocked / projects.length) * 100);
  return [
    { metric: '일정', score: schedule },
    { metric: '범위', score: scope },
    { metric: '안정성', score: stability },
  ];
}

/** Calculate where today falls in a 12-week window starting from the quarter start (0–100%). */
function todayLinePercent(): number {
  const now = new Date();
  const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const qStart = new Date(now.getFullYear(), qStartMonth, 1);
  const windowMs = 84 * 24 * 3600 * 1000; // 12 weeks
  const elapsed = now.getTime() - qStart.getTime();
  return Math.min(100, Math.max(0, (elapsed / windowMs) * 100));
}

export function ProgressPage() {
  const [tab, setTab] = useState('portfolio');
  const [createOpen, setCreateOpen] = useState(false);
  const { data: projects = [] } = useProjects();
  const { update: updateProject } = useProjectMutations();
  const PROJECTS = projects;
  const todayPct = todayLinePercent();

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <Tabs.Root value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between border-b border-border">
          <Tabs.List className="flex items-center gap-1">
            {[
              { id: 'portfolio', label: '포트폴리오', icon: LayoutGrid },
              { id: 'gantt', label: '간트', icon: GanttChart },
              { id: 'health', label: '헬스체크', icon: HeartPulse },
            ].map(t => (
              <Tabs.Trigger key={t.id} value={t.id}
                className="px-3 h-10 text-[12.5px] font-medium text-fg-2 hover:text-fg-1 inline-flex items-center gap-1.5 border-b-2 border-transparent data-[state=active]:text-fg data-[state=active]:border-accent">
                <t.icon size={13} /> {t.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="mb-1.5 mr-1"
          >
            <Plus size={14} /> 새 프로젝트
          </Button>
        </div>
        <ProjectCreateDialog open={createOpen} onOpenChange={setCreateOpen} />

        <Tabs.Content value="portfolio" className="pt-4 outline-none">
          <Card>
            <div className="grid grid-cols-[1fr_120px_120px_120px_120px_100px] gap-3 px-4 h-9 items-center text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold border-b border-border">
              <div>프로젝트</div><div>계획</div><div>실적</div><div>일정 차이</div><div>예산 소진</div><div>리스크</div>
            </div>
            {PROJECTS.map(p => {
              const planned = Math.min(100, p.progress + 8);
              const diff = p.progress - planned;
              return (
                <div key={p.id} className="grid grid-cols-[1fr_120px_120px_120px_120px_100px] gap-3 px-4 py-3 items-center text-[12.5px] border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="font-medium text-fg truncate">{p.name}</span>
                    <Badge tone="neutral" className="mono">{p.code}</Badge>
                  </div>
                  <div><Progress value={planned} /><div className="text-[10.5px] mono text-fg-3 mt-0.5">{planned}%</div></div>
                  <div><Progress value={p.progress} tone={p.status === 'done' ? 'success' : 'accent'} /><div className="text-[10.5px] mono text-fg-1 mt-0.5 font-semibold">{p.progress}%</div></div>
                  <div className={`mono text-[12px] font-semibold ${diff < -5 ? 'text-danger' : diff < 0 ? 'text-warning' : 'text-success'}`}>{diff > 0 ? '+' : ''}{diff}%p</div>
                  <div>
                    {p.budget != null
                      ? <><Progress value={Math.min(100, Math.round((p.progress / 100) * p.budget))} tone="warning" /><div className="text-[10.5px] mono text-fg-3 mt-0.5">{(p.budget / 1000000).toFixed(1)}M</div></>
                      : <div className="text-[10.5px] text-fg-3">미설정</div>}
                  </div>
                  <div className="flex items-center gap-1">
                    <select
                      aria-label={`${p.name} 상태`}
                      value={p.status}
                      disabled={updateProject.isPending}
                      onChange={e =>
                        updateProject.mutate({
                          id: p.id,
                          patch: { status: e.target.value as StatusKey },
                        })
                      }
                      className="text-[10.5px] rounded border border-border bg-bg-1 px-1 py-0.5 mono"
                    >
                      {PROJECT_STATUS_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {p.progress < 30 ? <Badge tone="danger">높음</Badge> : p.progress < 60 ? <Badge tone="warning">중간</Badge> : <Badge tone="success">낮음</Badge>}
                  </div>
                </div>
              );
            })}
            {PROJECTS.length === 0 && (
              <div className="px-4 py-8 text-center text-fg-3 text-[12.5px]">
                프로젝트가 없습니다. "새 프로젝트" 로 시작하세요.
              </div>
            )}
          </Card>
        </Tabs.Content>

        <Tabs.Content value="gantt" className="pt-4 outline-none">
          <Card>
            <div className="grid grid-cols-[200px_1fr] border-b border-border">
              <div />
              <div className="grid grid-cols-12 px-2 py-2 text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold">
                {['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12'].map(w => <div key={w} className="text-center">{w}</div>)}
              </div>
            </div>
            {PROJECTS.map((p, i) => (
              <div key={p.id} className="grid grid-cols-[200px_1fr] border-b border-border last:border-0 items-center">
                <div className="px-3 py-3 flex items-center gap-2 text-[12.5px]">
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color }} /><span className="truncate">{p.name}</span>
                </div>
                <div className="relative h-10">
                  <div className="absolute top-2.5 h-5 rounded-md flex items-center px-2 text-[10px] text-white font-medium" style={{
                    left: `${i * 5}%`, width: `${30 + p.progress * 0.4}%`, background: p.color, opacity: 0.85,
                  }}>
                    {p.code} · {p.progress}%
                  </div>
                  {/* milestone */}
                  <div className="absolute top-3 w-3 h-3 rotate-45" style={{ left: `${i * 5 + 30 + p.progress * 0.4 - 1.5}%`, background: 'var(--color-warning)' }} />
                </div>
              </div>
            ))}
            {/* today line — dynamic position in 12-week quarter window */}
            <div className="absolute top-0 bottom-0 w-px bg-danger" style={{ left: `${todayPct}%` }} />
          </Card>
        </Tabs.Content>

        <Tabs.Content value="health" className="pt-4 grid grid-cols-3 gap-4 outline-none">
          <Card className="col-span-2">
            <CardHeader><CardTitle>프로젝트 헬스 메트릭</CardTitle></CardHeader>
            <CardBody className="grid grid-cols-3 gap-4">
              {deriveHealth(PROJECTS).map(h => (
                <div key={h.metric} className="rounded-lg border border-border p-4">
                  <div className="text-[11.5px] text-fg-2 uppercase tracking-wider font-semibold">{h.metric}</div>
                  {h.score === null ? (
                    <div className="mt-2">
                      <div className="text-[14px] text-fg-3">{h.hint ?? '측정 중'}</div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2 mt-2">
                        <div className={`text-[32px] font-bold mono leading-none ${h.score >= 80 ? 'text-success' : h.score >= 65 ? 'text-warning' : 'text-danger'}`}>{h.score}</div>
                        <div className="text-[11px] text-fg-3">/100</div>
                      </div>
                      <Progress value={h.score} tone={h.score >= 80 ? 'success' : h.score >= 65 ? 'warning' : 'danger'} className="mt-3" />
                    </>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>주의 필요</CardTitle></CardHeader>
            <CardBody className="space-y-2.5 text-[12.5px]">
              {(() => {
                const blocked = PROJECTS.filter(p => p.status === 'blocked');
                const lowProgress = PROJECTS.filter(p => p.status !== 'done' && p.progress < 30);
                if (blocked.length === 0 && lowProgress.length === 0) {
                  return (
                    <div className="text-fg-3 text-[12px] py-2">
                      현재 주의가 필요한 프로젝트가 없습니다.
                    </div>
                  );
                }
                return (
                  <>
                    {blocked.map(p => (
                      <div key={p.id} className="rounded-md border border-danger/30 bg-danger-soft p-2.5">
                        <div className="font-semibold text-fg truncate">{p.name} 차단됨</div>
                        <div className="text-fg-2 mt-0.5">진척률 {p.progress}% · 즉시 검토 필요.</div>
                      </div>
                    ))}
                    {lowProgress.map(p => (
                      <div key={p.id} className="rounded-md border border-warning/30 bg-warning-soft p-2.5">
                        <div className="font-semibold text-fg truncate">{p.name} 진척 부족</div>
                        <div className="text-fg-2 mt-0.5">진척률 {p.progress}% · 일정 점검 권장.</div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </CardBody>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
