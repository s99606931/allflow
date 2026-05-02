'use client';

import { useState, useMemo } from 'react';
import { useGantt, useProjects } from '@/lib/hooks/use-data';
import type { GanttTask } from '@/lib/api/extended';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const CELL_W = 32;
const ROW_H = 40;
const LABEL_W = 200;

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDate(s: string): Date {
  return new Date(s + 'T00:00:00');
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#8892b0',
  doing: '#5b6cff',
  review: '#d4a017',
  done: '#34b27d',
  blocked: '#e05252',
};

function TaskBar({ task, startPx, widthPx, color, isMilestone }: {
  task: GanttTask;
  startPx: number;
  widthPx: number;
  color: string;
  isMilestone: boolean;
}) {
  if (isMilestone) {
    return (
      <div
        title={task.title}
        style={{
          position: 'absolute',
          left: startPx + widthPx / 2 - 7,
          top: ROW_H / 2 - 7,
          width: 14,
          height: 14,
          background: color,
          transform: 'rotate(45deg)',
          borderRadius: 2,
          zIndex: 3,
        }}
      />
    );
  }

  return (
    <div
      title={`${task.title} — ${task.progress}%`}
      style={{
        position: 'absolute',
        left: startPx + 1,
        top: ROW_H / 2 - 11,
        width: Math.max(widthPx - 2, 4),
        height: 22,
        borderRadius: 4,
        background: color,
        opacity: 0.88,
        overflow: 'hidden',
        zIndex: 3,
      }}
    >
      {task.progress > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${task.progress}%`,
            background: 'rgba(255,255,255,0.22)',
          }}
        />
      )}
      <span
        style={{
          position: 'absolute',
          left: 6,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 11,
          fontWeight: 500,
          color: '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 'calc(100% - 12px)',
          pointerEvents: 'none',
        }}
      >
        {task.title}
      </span>
    </div>
  );
}

export function GanttPage() {
  const [offsetDays, setOffsetDays] = useState(0);
  const viewDays = 28;
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const viewStart = useMemo(() => {
    const d = addDays(new Date(), -7 + offsetDays);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [offsetDays]);

  const viewEnd = useMemo(() => addDays(viewStart, viewDays - 1), [viewStart, viewDays]);

  const { data: projects = [] } = useProjects();
  const projectNameMap = useMemo(
    () => new Map(projects.map(p => [p.id, p.name])),
    [projects],
  );

  const { data, isLoading } = useGantt({
    from: isoDate(viewStart),
    to: isoDate(viewEnd),
  });

  const days = useMemo(
    () => Array.from({ length: viewDays }, (_, i) => addDays(viewStart, i)),
    [viewStart, viewDays],
  );

  const tasks = useMemo(() => {
    if (!data?.tasks) return [];
    return projectFilter === 'all'
      ? data.tasks
      : data.tasks.filter(t => t.projectId === projectFilter);
  }, [data, projectFilter]);

  const projectIds = useMemo(
    () => [...new Set(data?.tasks.map(t => t.projectId) ?? [])],
    [data],
  );

  const today = isoDate(new Date());
  const todayOffsetPx = diffDays(viewStart, new Date()) * CELL_W;
  const gridW = viewDays * CELL_W;

  const barMap = useMemo(() => {
    const map = new Map<string, { startPx: number; endPx: number; y: number }>();
    tasks.forEach((task, idx) => {
      if (!task.startDate) return;
      const s = toDate(task.startDate);
      const e = task.endDate ? toDate(task.endDate) : s;
      const rawStart = diffDays(viewStart, s);
      const rawEnd = diffDays(viewStart, e) + 1;
      const clampedStart = Math.max(0, rawStart);
      const clampedEnd = Math.min(viewDays, rawEnd);
      if (clampedEnd > clampedStart) {
        map.set(task.id, {
          startPx: clampedStart * CELL_W,
          endPx: clampedEnd * CELL_W,
          y: idx * ROW_H + ROW_H / 2,
        });
      }
    });
    return map;
  }, [tasks, viewStart, viewDays]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-fg-3 text-sm">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOffsetDays(o => o - 7)}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-border hover:bg-hover transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setOffsetDays(0)}
            className="h-8 px-3 rounded-md border border-border text-[12px] hover:bg-hover transition-colors"
          >
            오늘
          </button>
          <button
            onClick={() => setOffsetDays(o => o + 7)}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-border hover:bg-hover transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <span className="text-[13px] text-fg-2">
          {isoDate(viewStart)} — {isoDate(viewEnd)}
        </span>

        <div className="flex items-center gap-1 ml-auto">
          <Filter size={13} className="text-fg-3" />
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="h-8 px-2 rounded-md border border-border bg-bg-1 text-[12px] text-fg"
          >
            <option value="all">전체 프로젝트</option>
            {projectIds.map(id => (
              <option key={id} value={id}>{projectNameMap.get(id) ?? id}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border bg-bg-1 overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ display: 'flex', minWidth: LABEL_W + gridW }}>
            {/* Left panel */}
            <div style={{ width: LABEL_W, flexShrink: 0 }}>
              {/* Header */}
              <div
                style={{ height: 40 }}
                className="border-b border-r border-border bg-bg-2 flex items-center px-4"
              >
                <span className="text-[11px] font-medium text-fg-3">태스크</span>
              </div>

              {/* Task labels */}
              {tasks.map(task => (
                <div
                  key={task.id}
                  style={{ height: ROW_H }}
                  className="border-b border-r border-border bg-bg-1 flex items-center px-4 gap-2"
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: task.projectColor ?? STATUS_COLORS[task.status] ?? '#888',
                      flexShrink: 0,
                    }}
                  />
                  <span className="text-[12px] text-fg truncate">{task.title}</span>
                </div>
              ))}

              {tasks.length === 0 && (
                <div style={{ height: 80 }} className="border-b border-r border-border flex items-center px-4">
                  <span className="text-fg-3 text-[12px]">표시할 태스크가 없습니다</span>
                </div>
              )}
            </div>

            {/* Right scroll panel */}
            <div style={{ flex: 1, position: 'relative' }}>
              {/* Day headers */}
              <div style={{ height: 40, display: 'flex', position: 'relative' }} className="border-b border-border bg-bg-2">
                {days.map((d, i) => {
                  const iso = isoDate(d);
                  const isToday = iso === today;
                  const isMonday = d.getDay() === 1;
                  return (
                    <div
                      key={iso}
                      style={{
                        width: CELL_W,
                        flexShrink: 0,
                        height: 40,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderLeft: isMonday && i > 0 ? '1px solid var(--color-border, #e2e8f0)' : undefined,
                        background: isToday ? 'oklch(0.62 0.18 255 / 0.1)' : undefined,
                      }}
                    >
                      <span className={`text-[10px] font-medium ${isToday ? 'text-accent' : 'text-fg-3'}`}>
                        {d.getDate()}
                      </span>
                      {isMonday && (
                        <span className="text-[9px] text-fg-4">
                          {d.toLocaleDateString('ko-KR', { month: 'short' })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Task rows with bars */}
              {tasks.map(task => {
                const color = task.projectColor ?? STATUS_COLORS[task.status] ?? '#888';
                let startPx = 0;
                let widthPx = 0;
                let visible = false;
                const isMilestone = task.kind === 'milestone';

                if (task.startDate) {
                  const s = toDate(task.startDate);
                  const e = task.endDate ? toDate(task.endDate) : s;
                  const rawStart = diffDays(viewStart, s);
                  const rawEnd = diffDays(viewStart, e) + 1;
                  const clampedStart = Math.max(0, rawStart);
                  const clampedEnd = Math.min(viewDays, rawEnd);

                  if (clampedEnd > clampedStart) {
                    startPx = clampedStart * CELL_W;
                    widthPx = Math.max((clampedEnd - clampedStart) * CELL_W, isMilestone ? 1 : 8);
                    visible = true;
                  }
                }

                return (
                  <div
                    key={task.id}
                    style={{ height: ROW_H, position: 'relative' }}
                    className="border-b border-border"
                  >
                    {/* Vertical grid lines */}
                    {days.map((d, i) => {
                      const isMonday = d.getDay() === 1;
                      const isToday = isoDate(d) === today;
                      return (
                        <div
                          key={i}
                          style={{
                            position: 'absolute',
                            left: i * CELL_W,
                            top: 0,
                            width: CELL_W,
                            height: ROW_H,
                            borderLeft: isMonday && i > 0 ? '1px solid var(--color-border, #e2e8f0)' : undefined,
                            background: isToday ? 'oklch(0.62 0.18 255 / 0.06)' : undefined,
                          }}
                        />
                      );
                    })}

                    {/* Today line */}
                    {todayOffsetPx >= 0 && todayOffsetPx < gridW && (
                      <div
                        style={{
                          position: 'absolute',
                          left: todayOffsetPx,
                          top: 0,
                          width: 1,
                          height: ROW_H,
                          background: 'oklch(0.62 0.18 255 / 0.6)',
                          zIndex: 2,
                        }}
                      />
                    )}

                    {/* Task bar */}
                    {visible && (
                      <TaskBar
                        task={task}
                        startPx={startPx}
                        widthPx={widthPx}
                        color={color}
                        isMilestone={isMilestone}
                      />
                    )}
                  </div>
                );
              })}

              {tasks.length === 0 && (
                <div style={{ height: 80 }} className="border-b border-border" />
              )}

              {/* Dependency arrows overlay */}
              {data?.dependencies && data.dependencies.length > 0 && tasks.length > 0 && (
                <svg
                  style={{
                    position: 'absolute',
                    top: 40,
                    left: 0,
                    width: gridW,
                    height: tasks.length * ROW_H,
                    pointerEvents: 'none',
                    overflow: 'visible',
                    zIndex: 4,
                  }}
                >
                  <defs>
                    <marker id="gantt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="oklch(0.62 0.18 255 / 0.55)" />
                    </marker>
                  </defs>
                  {data.dependencies.map(dep => {
                    const from = barMap.get(dep.predecessorId);
                    const to = barMap.get(dep.successorId);
                    if (!from || !to) return null;
                    const mx = (from.endPx + to.startPx) / 2;
                    return (
                      <path
                        key={dep.id}
                        d={`M${from.endPx},${from.y} C${mx},${from.y} ${mx},${to.y} ${to.startPx},${to.y}`}
                        fill="none"
                        stroke="oklch(0.62 0.18 255 / 0.55)"
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                        markerEnd="url(#gantt-arrow)"
                      />
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      {data && (
        <div className="flex items-center gap-4 text-[11px] text-fg-3 flex-wrap">
          <span>총 {data.tasks.length}개 태스크</span>
          <span>의존성 {data.dependencies.length}건</span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 12, height: 12, borderRadius: 3, background: STATUS_COLORS.doing, display: 'inline-block' }} />
            진행중
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, background: '#888', transform: 'rotate(45deg)', display: 'inline-block' }} />
            마일스톤
          </span>
        </div>
      )}
    </div>
  );
}
