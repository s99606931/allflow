'use client';

import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Card, Avatar, Badge, Button, StatusDot } from '@/components/ui/primitives';
import { useTasks, useTaskMutations, useProjects } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import type { StatusKey } from '@/lib/schemas';
import { TaskDetailDialog } from './task-detail';
import { TaskCreateDialog } from '@/components/dialogs/task-create-dialog';
import { CheckCircle2, Circle, Filter, KanbanSquare, LayoutList, Plus, Search, CalendarDays } from 'lucide-react';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';

const COLS: { id: StatusKey; label: string; color: string }[] = [
  { id: 'todo', label: '대기', color: 'oklch(0.7 0.01 250)' },
  { id: 'doing', label: '진행중', color: 'oklch(0.62 0.18 255)' },
  { id: 'review', label: '리뷰', color: 'oklch(0.7 0.15 70)' },
  { id: 'done', label: '완료', color: 'oklch(0.65 0.16 155)' },
  { id: 'blocked', label: '블록', color: 'oklch(0.62 0.2 25)' },
];

export function TasksPage() {
  const [tab, setTab] = useState('list');
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine' | 'today' | 'overdue'>('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'med' | 'low'>('all');
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();
  const { update } = useTaskMutations();
  const userMap = useUserMap();

  const filtered = tasks.filter(t => {
    if (filter === 'mine' && t.assignee !== 'me') return false;
    if (filter === 'today' && t.due !== '오늘') return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  const filterCounts = {
    all: tasks.length,
    mine: tasks.filter(t => t.assignee === 'me').length,
    today: tasks.filter(t => t.due === '오늘').length,
    overdue: tasks.filter(t => t.status !== 'done' && t.due && t.due < new Date().toISOString().slice(0, 10)).length,
  };

  const onCreate = () => setCreateOpen(true);

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <AiGuideWidget
        systemContext={`태스크 관리 — 전체 ${filterCounts.all}건, 오늘 마감 ${filterCounts.today}건, 기한 초과 ${filterCounts.overdue}건`}
        hints={['마감 임박 태스크 알려줘', '우선순위 재조정 제안해줘', '블로킹 태스크 찾아줘']}
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
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] text-fg-3 font-semibold uppercase tracking-wider">우선순위:</span>
          {(['all', 'high', 'med', 'low'] as const).map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={`px-2.5 h-7 rounded text-[12px] font-medium transition-colors border ${priorityFilter === p ? 'bg-accent-soft border-accent text-accent-strong' : 'border-border text-fg-2 hover:text-fg-1'}`}>
              {p === 'all' ? '전체' : p === 'high' ? '높음' : p === 'med' ? '보통' : '낮음'}
            </button>
          ))}
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
                <button key={t.id} onClick={() => setOpenTask(t.id)}
                  className="w-full grid grid-cols-[20px_80px_1fr_120px_70px_100px_24px] gap-3 px-4 py-2.5 items-center text-[12.5px] border-b border-border last:border-0 hover:bg-hover transition-colors text-left">
                  {t.status === 'done' ? <CheckCircle2 size={16} className="text-success" /> : <Circle size={16} className="text-fg-3" />}
                  <span className="mono text-[11px] text-fg-3">{t.id}</span>
                  <span className="text-fg truncate font-medium">{t.title}</span>
                  <StatusDot status={t.status} />
                  {t.priority === 'high' ? <Badge tone="danger">높음</Badge> : t.priority === 'med' ? <Badge tone="warning">중간</Badge> : <Badge tone="neutral">낮음</Badge>}
                  <span className="mono text-fg-2 text-[11.5px]">{t.due}</span>
                  {u && <Avatar user={u} size={20} />}
                </button>
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
                    <span className="text-[11px] mono text-fg-3 ml-auto">{items.length}</span>
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

function CalendarMini({ tasks, onTask }: { tasks: Array<{ id: string; title: string }>; onTask: (id: string) => void }) {
  // Simplified month view — current week tasks scattered
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const cells = Array.from({ length: 35 }, (_, i) => i - 6); // pretend offset

  return (
    <Card>
      <div className="grid grid-cols-7 border-b border-border">
        {days.map(d => <div key={d} className="px-3 py-2 text-[10.5px] uppercase tracking-wider font-semibold text-fg-3 text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map(c => {
          const day = c < 1 ? '' : c > 30 ? '' : c;
          const taskHere = day ? tasks.find((t, i) => i % 5 === c % 5 && c > 5 && c < 25 && i < 5) : undefined;
          return (
            <div key={c} className="min-h-[90px] border-b border-r border-border p-1.5 last:border-r-0">
              <div className="text-[11px] mono text-fg-2">{day}</div>
              {taskHere && (
                <button onClick={() => onTask(taskHere.id)}
                  className="block w-full mt-1 text-left text-[10.5px] px-1.5 py-1 rounded bg-accent-soft text-accent-strong truncate hover:bg-accent hover:text-accent-fg transition-colors">
                  {taskHere.title}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
