'use client';

import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Card, CardBody, CardHeader, CardTitle, Badge, Progress } from '@/components/ui/primitives';
import { useProjects, useProjectMutations } from '@/lib/hooks/use-data';
import type { StatusKey } from '@/lib/schemas';
import { LayoutGrid, GanttChart, HeartPulse } from 'lucide-react';

const PROJECT_STATUS_OPTIONS: { value: StatusKey; label: string }[] = [
  { value: 'todo', label: '대기' },
  { value: 'doing', label: '진행' },
  { value: 'review', label: '검토' },
  { value: 'done', label: '완료' },
  { value: 'blocked', label: '차단' },
];

const HEALTH = [
  { metric: '일정', score: 78 }, { metric: '예산', score: 85 }, { metric: '범위', score: 72 },
  { metric: '팀 부하', score: 64 }, { metric: '품질', score: 91 }, { metric: '소통', score: 88 },
];

export function ProgressPage() {
  const [tab, setTab] = useState('portfolio');
  const { data: projects = [] } = useProjects();
  const { update: updateProject } = useProjectMutations();
  const PROJECTS = projects;

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List className="flex items-center gap-1 border-b border-border">
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
                  <div><Progress value={62 + (p.code.charCodeAt(p.code.length - 1) % 20)} tone="warning" /></div>
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
            {/* today line */}
            <div className="absolute top-0 bottom-0 w-px bg-danger" style={{ left: '46%' }} />
          </Card>
        </Tabs.Content>

        <Tabs.Content value="health" className="pt-4 grid grid-cols-3 gap-4 outline-none">
          <Card className="col-span-2">
            <CardHeader><CardTitle>프로젝트 헬스 메트릭</CardTitle></CardHeader>
            <CardBody className="grid grid-cols-3 gap-4">
              {HEALTH.map(h => (
                <div key={h.metric} className="rounded-lg border border-border p-4">
                  <div className="text-[11.5px] text-fg-2 uppercase tracking-wider font-semibold">{h.metric}</div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <div className={`text-[32px] font-bold mono leading-none ${h.score >= 80 ? 'text-success' : h.score >= 65 ? 'text-warning' : 'text-danger'}`}>{h.score}</div>
                    <div className="text-[11px] text-fg-3">/100</div>
                  </div>
                  <Progress value={h.score} tone={h.score >= 80 ? 'success' : h.score >= 65 ? 'warning' : 'danger'} className="mt-3" />
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>주의 필요</CardTitle></CardHeader>
            <CardBody className="space-y-2.5 text-[12.5px]">
              <div className="rounded-md border border-warning/30 bg-warning-soft p-2.5">
                <div className="font-semibold text-fg">팀 부하 64점</div>
                <div className="text-fg-2 mt-0.5">엔지니어링팀 평균 8.4건/인. 재분배 권장.</div>
              </div>
              <div className="rounded-md border border-danger/30 bg-danger-soft p-2.5">
                <div className="font-semibold text-fg">결제 시스템 진척 둔화</div>
                <div className="text-fg-2 mt-0.5">전주 대비 -8%p. 차단된 태스크 2건.</div>
              </div>
            </CardBody>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
