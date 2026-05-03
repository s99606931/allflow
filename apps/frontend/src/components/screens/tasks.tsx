'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import * as Tabs from '@radix-ui/react-tabs';
import { Card, Avatar, Badge, Button } from '@/components/ui/primitives';
import { useTasks, useTaskMutations, useProjects, useMe } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import type { StatusKey } from '@/lib/schemas';
import { TaskDetailDialog } from './task-detail';
import { TaskCreateDialog } from '@/components/dialogs/task-create-dialog';
import { ArrowUpDown, CheckCircle2, Circle, Filter, KanbanSquare, LayoutList, Plus, Search, CalendarDays, X, Check } from 'lucide-react';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';
import { BusinessFlowStepper } from '@/components/ai/business-flow-stepper';
import { BUSINESS_FLOWS } from '@/lib/business-flows';
import { useRouter } from 'next/navigation';

const COLS: { id: StatusKey; label: string; color: string }[] = [
  { id: 'todo', label: '대기', color: 'oklch(0.7 0.01 250)' },
  { id: 'doing', label: '진행중', color: 'oklch(0.62 0.18 255)' },
  { id: 'review', label: '리뷰', color: 'oklch(0.7 0.15 70)' },
  { id: 'done', label: '완료', color: 'oklch(0.65 0.16 155)' },
  { id: 'blocked', label: '블록', color: 'oklch(0.62 0.2 25)' },
];

export function TasksPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState('list');
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine' | 'today' | 'overdue'>('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'med' | 'low'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'due' | 'priority' | 'created'>('due');

  useEffect(() => {
    const a = searchParams.get('assignee');
    if (a) setAssigneeFilter(a);
  }, [searchParams]);

  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: me } = useMe();
  const { update } = useTaskMutations();
  const userMap = useUserMap();

  const todayStr = new Date().toISOString().slice(0, 10);

  function isDueToday(due: string): boolean {
    return due === '오늘' || due === todayStr;
  }

  function isOverdue(due: string, status: string): boolean {
    if (status === 'done') return false;
    if (!due) return false;
    if (due === '오늘' || due === '내일') return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(due) && due < todayStr;
  }

  const PRIORITY_ORDER: Record<string, number> = { high: 0, med: 1, low: 2 };
  const filtered = tasks
    .filter(t => {
      if (assigneeFilter && t.assignee !== assigneeFilter) return false;
      if (filter === 'mine' && t.assignee !== me?.id) return false;
      if (filter === 'today' && !isDueToday(t.due)) return false;
      if (filter === 'overdue' && !isOverdue(t.due, t.status)) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'due') return (a.due ?? '9999') < (b.due ?? '9999') ? -1 : 1;
      if (sortBy === 'priority') return (PRIORITY_ORDER[a.priority ?? 'low'] ?? 2) - (PRIORITY_ORDER[b.priority ?? 'low'] ?? 2);
      return (b.id ?? '').localeCompare(a.id ?? '');
    });

  const filterCounts = {
    all: tasks.length,
    mine: tasks.filter(t => t.assignee === me?.id).length,
    today: tasks.filter(t => isDueToday(t.due)).length,
    overdue: tasks.filter(t => isOverdue(t.due, t.status)).length,
  };

  const isFiltersActive = priorityFilter !== 'all' || search !== '' || filter !== 'all' || !!assigneeFilter;

  const statusCounts = Object.fromEntries(
    COLS.map(col => [col.id, filtered.filter(t => t.status === col.id).length])
  ) as Record<string, number>;

  const onCreate = () => setCreateOpen(true);
  const router = useRouter();

  // 진행 중 태스크가 가장 많은 컬럼으로 현재 단계 추론
  const flowStepId =
    statusCounts.review && statusCounts.review > 0 ? 'review' :
    statusCounts.doing && statusCounts.doing > 0 ? 'doing' :
    filterCounts.all === 0 ? 'create' :
    statusCounts.done === filterCounts.all ? 'done' : 'create';

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId={flowStepId}
        systemContext={`태스크 ${filterCounts.all}건 중 진행 ${statusCounts.doing ?? 0}건, 리뷰 ${statusCounts.review ?? 0}건`}
        onStepSelect={(step) => router.push(step.screen)}
        enableServerSync
      />
      <AiGuideWidget
        systemContext={`태스크 관리 — 전체 ${filterCounts.all}건, 오늘 마감 ${filterCounts.today}건, 기한 초과 ${filterCounts.overdue}건`}
        hints={[
          filterCounts.overdue > 0 ? `기한 초과 ${filterCounts.overdue}건 처리 방법 알려줘` : '마감 임박 태스크 알려줘',
          filterCounts.today > 0 ? `오늘 마감 ${filterCounts.today}건 우선순위 정해줘` : '우선순위 재조정 제안해줘',
          '블로킹 태스크 찾아줘',
        ]}
        quickActions={[
          ...(filterCounts.overdue > 0 ? [{ label: `기한 초과 ${filterCounts.overdue}건`, onClick: () => setFilter('overdue') }] : []),
          ...(filterCounts.today > 0 ? [{ label: `오늘 마감 ${filterCounts.today}건`, onClick: () => setFilter('today') }] : []),
        ]}
      />
      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-bg-2 border border-border">
          {(
            [
              { id: 'all', label: '전체' },
              { id: 'mine', label: '내 태스크' },
              { id: 'today', label: '오늘' },
              { id: 'overdue', label: '⏰ 지연' },
            ] satisfies { id: typeof filter; label: string }[]
          ).map(c => (
            <button key={c.id} onClick={() => setFilter(c.id)}
              className={`px-2.5 h-7 rounded text-[12px] font-medium transition-colors ${
                filter === c.id ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2 hover:text-fg-1'
              }`}>
              {c.label}
              {filterCounts[c.id] > 0 && (
                <span className={`ml-1 text-[10px] px-1 py-0.5 rounded-full ${filter === c.id ? 'bg-accent/20 text-accent' : 'bg-bg-1 text-fg-3'}`}>
                  {filterCounts[c.id]}
                </span>
              )}
            </button>
          ))}
        </div>
        <Button variant={filterOpen ? 'primary' : 'secondary'} size="sm" onClick={() => setFilterOpen(v => !v)}><Filter size={13} /> 필터</Button>
        <div className="flex-1" />
        <button
          onClick={() => setSortBy(s => s === 'due' ? 'priority' : s === 'priority' ? 'created' : 'due')}
          className="flex items-center gap-1 h-8 px-2.5 rounded-md border border-border text-[12px] text-fg-2 hover:text-fg-1 hover:bg-hover transition-colors"
        >
          <ArrowUpDown size={12} /> {sortBy === 'due' ? '마감일순' : sortBy === 'priority' ? '우선순위순' : '최신순'}
        </button>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="태스크 검색..."
            className="h-8 w-56 pl-8 pr-3 rounded-md bg-bg-elev border border-border text-[12.5px] focus:outline-none focus:border-accent" />
        </div>
        <Button variant="primary" size="sm" onClick={onCreate}>
          <Plus size={13} /> 새 태스크
        </Button>
      </div>

      {filterOpen && (
        <div className="space-y-2 px-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-fg-3 font-semibold uppercase tracking-wider">우선순위:</span>
            {(['all', 'high', 'med', 'low'] as const).map(p => (
              <button key={p} onClick={() => setPriorityFilter(p)}
                className={`px-2.5 h-7 rounded text-[12px] font-medium transition-colors border ${priorityFilter === p ? 'bg-accent-soft border-accent text-accent-strong' : 'border-border text-fg-2 hover:text-fg-1'}`}>
                {p === 'all' ? '전체' : p === 'high' ? '높음' : p === 'med' ? '보통' : '낮음'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-fg-3 font-semibold uppercase tracking-wider">상태별:</span>
            {COLS.map(col => (
              <div key={col.id} className="flex items-center gap-1.5 px-2.5 h-7 rounded border border-border text-[12px] text-fg-2">
                <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <span>{col.label}</span>
                <span className="text-[10.5px] mono font-semibold px-1.5 py-0.5 rounded-full bg-bg-subtle text-fg-2">
                  {statusCounts[col.id] ?? 0}
                </span>
              </div>
            ))}
            {assigneeFilter && (
              <div className="flex items-center gap-1.5 px-2.5 h-7 rounded bg-accent-soft border border-accent/40 text-[12px] text-accent-strong">
                담당자 필터 활성
                <button type="button" onClick={() => setAssigneeFilter(null)} className="hover:text-accent ml-1"><X size={10} /></button>
              </div>
            )}
            {isFiltersActive && (
              <Button variant="ghost" size="sm"
                onClick={() => { setPriorityFilter('all'); setSearch(''); setFilter('all'); setAssigneeFilter(null); }}
                className="ml-auto text-fg-3 hover:text-fg">
                <X size={12} /> 필터 초기화
              </Button>
            )}
          </div>
        </div>
      )}

      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List className="flex items-center gap-1 border-b border-border">
          {[
            { id: 'list', label: '리스트', icon: LayoutList },
            { id: 'board', label: '보드', icon: KanbanSquare },
            { id: 'calendar', label: '캘린더', icon: CalendarDays },
          ].map(t => (
            <Tabs.Trigger key={t.id} value={t.id}
              className="px-3 h-10 text-[12.5px] font-medium text-fg-2 hover:text-fg-1 inline-flex items-center gap-1.5 border-b-2 border-transparent data-[state=active]:text-fg data-[state=active]:border-accent transition-colors">
              <t.icon size={13} /> {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="list" className="pt-4 outline-none">
          <Card>
            {filtered.map(t => {
              const u = userMap.get(t.assignee);
              return (
                <div key={t.id}
                  className="group grid grid-cols-[20px_80px_1fr_130px_70px_100px_44px] gap-3 px-4 py-2.5 items-center text-[12.5px] border-b border-border last:border-0 hover:bg-hover transition-colors">
                  <button
                    type="button"
                    aria-label={t.status === 'done' ? '완료 취소' : '완료로 표시'}
                    onClick={() => update.mutate({ id: t.id, patch: { status: t.status === 'done' ? 'todo' : 'done' } })}
                    className="text-left"
                  >
                    {t.status === 'done' ? <CheckCircle2 size={16} className="text-success" /> : <Circle size={16} className="text-fg-3 hover:text-success transition-colors" />}
                  </button>
                  <span className="mono text-[11px] text-fg-3">{t.id}</span>
                  <button type="button" onClick={() => setOpenTask(t.id)} className="text-fg truncate font-medium text-left hover:underline">
                    {t.title}
                  </button>
                  <select
                    aria-label={`${t.id} 상태 변경`}
                    value={t.status}
                    disabled={update.isPending}
                    onClick={e => e.stopPropagation()}
                    onChange={e => update.mutate({ id: t.id, patch: { status: e.target.value as StatusKey } })}
                    className="h-6 text-[11px] rounded bg-bg-1 border border-border px-1.5 focus:outline-none focus:border-accent w-full"
                  >
                    <option value="todo">대기</option>
                    <option value="doing">진행중</option>
                    <option value="review">리뷰</option>
                    <option value="done">완료</option>
                    <option value="blocked">블록</option>
                  </select>
                  {t.priority === 'high' ? <Badge tone="danger">높음</Badge> : t.priority === 'med' ? <Badge tone="warning">중간</Badge> : <Badge tone="neutral">낮음</Badge>}
                  <span className="mono text-fg-2 text-[11.5px]">{t.due}</span>
                  <div className="flex items-center gap-1.5 justify-end">
                    {u && <Avatar user={u} size={20} />}
                    {t.status !== 'done' && (
                      <button
                        type="button"
                        aria-label="완료로 표시"
                        onClick={() => update.mutate({ id: t.id, patch: { status: 'done' } })}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded bg-success/10 text-success hover:bg-success/20 grid place-items-center"
                      >
                        <Check size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        </Tabs.Content>

        <Tabs.Content value="board" className="pt-4 outline-none">
          <div className="grid grid-cols-5 gap-3">
            {COLS.map(col => {
              const items = filtered.filter(t => t.status === col.id);
              return (
                <div key={col.id} className="bg-bg-1 rounded-lg border border-border min-h-[400px]">
                  <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    <span className="text-[12px] font-semibold text-fg">{col.label}</span>
                    <span className="ml-auto text-[10.5px] mono font-semibold px-1.5 py-0.5 rounded-full bg-bg-subtle text-fg-2">{items.length}</span>
                  </div>
                  <div className="p-2 space-y-2">
                    {items.map(t => {
                      const u = userMap.get(t.assignee);
                      const proj = projects.find(p => p.id === t.proj);
                      return (
                        <div key={t.id} className="rounded-md border border-border bg-bg-elev p-2.5 hover:shadow-md hover:border-border-strong transition-all space-y-2">
                          <button onClick={() => setOpenTask(t.id)} className="w-full text-left">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="px-1.5 h-4 rounded text-[10px] mono font-semibold text-white" style={{ background: proj?.color }}>{proj?.code}</span>
                              <span className="mono text-[10.5px] text-fg-3 ml-auto">{t.id}</span>
                            </div>
                            <div className="text-[12px] font-medium text-fg leading-snug mb-2">{t.title}</div>
                            <div className="flex items-center gap-1.5">
                              {t.priority === 'high' && <Badge tone="danger">높음</Badge>}
                              <span className="mono text-[10.5px] text-fg-2">{t.due}</span>
                              {u && <span className="ml-auto"><Avatar user={u} size={18} /></span>}
                            </div>
                          </button>
                          <select
                            aria-label={`${t.id} 상태 변경`}
                            value={t.status}
                            disabled={update.isPending}
                            onChange={(e) => update.mutate({ id: t.id, patch: { status: e.target.value as StatusKey } })}
                            className="w-full h-6 text-[11px] rounded bg-bg-1 border border-border px-1.5 focus:outline-none focus:border-accent"
                          >
                            <option value="todo">대기</option>
                            <option value="doing">진행중</option>
                            <option value="review">리뷰</option>
                            <option value="done">완료</option>
                            <option value="blocked">블록</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Tabs.Content>

        <Tabs.Content value="calendar" className="pt-4 outline-none">
          <CalendarMini tasks={filtered} onTask={(id) => setOpenTask(id)} />
        </Tabs.Content>
      </Tabs.Root>

      <TaskDetailDialog taskId={openTask} onClose={() => setOpenTask(null)} />
      <TaskCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function parseDue(due: string, today: Date): { year: number; month: number; day: number } | null {
  if (due === '오늘') return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
  if (due === '내일') {
    const t = new Date(today); t.setDate(t.getDate() + 1);
    return { year: t.getFullYear(), month: t.getMonth(), day: t.getDate() };
  }
  const m = due.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { year: +m[1], month: +m[2] - 1, day: +m[3] };
  return null;
}

function CalendarMini({ tasks, onTask }: { tasks: Array<{ id: string; title: string; due: string }>; onTask: (id: string) => void }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
  const firstDaySun = new Date(viewYear, viewMonth, 1).getDay();
  const mondayOffset = (firstDaySun + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const totalCells = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

  const dayTaskMap = new Map<number, typeof tasks>();
  for (const task of tasks) {
    const parsed = parseDue(task.due, today);
    if (parsed && parsed.year === viewYear && parsed.month === viewMonth) {
      const existing = dayTaskMap.get(parsed.day) ?? [];
      dayTaskMap.set(parsed.day, [...existing, task]);
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  return (
    <Card>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-hover text-fg-2 text-lg leading-none">‹</button>
        <span className="text-[13px] font-semibold text-fg">{viewYear}년 {viewMonth + 1}월</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-hover text-fg-2 text-lg leading-none">›</button>
      </div>
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_LABELS.map(d => <div key={d} className="px-3 py-2 text-[10.5px] uppercase tracking-wider font-semibold text-fg-3 text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - mondayOffset + 1;
          const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
          const isToday = inMonth && viewYear === today.getFullYear() && viewMonth === today.getMonth() && dayNum === today.getDate();
          const cellTasks = inMonth ? (dayTaskMap.get(dayNum) ?? []) : [];
          return (
            <div key={i} className={`min-h-[90px] border-b border-r border-border p-1.5 ${i % 7 === 6 ? 'border-r-0' : ''} ${!inMonth ? 'bg-bg-subtle opacity-40' : ''}`}>
              <div className={`text-[11px] mono w-5 h-5 flex items-center justify-center rounded-full mb-0.5 ${isToday ? 'bg-accent text-accent-fg font-bold' : 'text-fg-2'}`}>
                {inMonth ? dayNum : ''}
              </div>
              <div className="space-y-0.5">
                {cellTasks.slice(0, 2).map(task => (
                  <button key={task.id} onClick={() => onTask(task.id)}
                    className="block w-full text-left text-[10.5px] px-1.5 py-0.5 rounded bg-accent-soft text-accent-strong truncate hover:bg-accent hover:text-accent-fg transition-colors">
                    {task.title}
                  </button>
                ))}
                {cellTasks.length > 2 && (
                  <div className="text-[9.5px] text-fg-3 pl-1">+{cellTasks.length - 2}개 더</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
