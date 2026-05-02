'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useTaskDependencies, useTaskDependencyMutations } from '@/lib/hooks/use-gantt';
import type { GanttTask, GanttDependency } from '@/lib/api/extended';

const DEP_TYPES: GanttDependency['type'][] = ['FS', 'SS', 'FF', 'SF'];
const DEP_LABELS: Record<GanttDependency['type'], string> = {
  FS: 'FS — 완료→시작',
  SS: 'SS — 시작→시작',
  FF: 'FF — 완료→완료',
  SF: 'SF — 시작→완료',
};

interface Props {
  taskId: string;
  tasks: GanttTask[];
  onClose: () => void;
}

export function GanttDepPanel({ taskId, tasks, onClose }: Props) {
  const { data: deps = [], isLoading } = useTaskDependencies(taskId);
  const { create, remove } = useTaskDependencyMutations(taskId);
  const [showForm, setShowForm] = useState(false);
  const [predId, setPredId] = useState('');
  const [depType, setDepType] = useState<GanttDependency['type']>('FS');
  const [lagDays, setLagDays] = useState(0);

  const currentTask = tasks.find(t => t.id === taskId);
  const availablePreds = tasks.filter(t => t.id !== taskId);

  function handleAdd() {
    if (!predId) return;
    create.mutate(
      { predecessorId: predId, type: depType, lagDays },
      {
        onSuccess: () => {
          setPredId('');
          setDepType('FS');
          setLagDays(0);
          setShowForm(false);
        },
      },
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-1 p-4 space-y-3 min-w-[280px]">
      <div className="flex items-center justify-between">
        <div className="text-[12.5px] font-semibold text-fg truncate max-w-[220px]">
          {currentTask?.title ?? taskId}
        </div>
        <button type="button" onClick={onClose} className="text-fg-3 hover:text-fg ml-2">
          <X size={13} />
        </button>
      </div>

      <div className="text-[11px] text-fg-3 font-medium uppercase tracking-wide">의존성</div>

      {isLoading && <div className="text-[12px] text-fg-3">불러오는 중...</div>}

      {!isLoading && deps.length === 0 && (
        <div className="text-[12px] text-fg-3">등록된 의존성이 없습니다.</div>
      )}

      {deps.map(dep => {
        const pred = tasks.find(t => t.id === dep.predecessorId);
        return (
          <div key={dep.id} className="flex items-center gap-2 text-[12px]">
            <span className="font-mono text-[10px] bg-bg-2 border border-border rounded px-1.5 py-0.5 text-fg-2">
              {dep.type}
            </span>
            <span className="flex-1 truncate text-fg">{pred?.title ?? dep.predecessorId}</span>
            {dep.lagDays !== 0 && (
              <span className="text-fg-3 text-[10.5px]">+{dep.lagDays}일</span>
            )}
            <button
              type="button"
              onClick={() => remove.mutate(dep.id)}
              disabled={remove.isPending}
              className="text-fg-3 hover:text-danger ml-1"
            >
              <Trash2 size={11} />
            </button>
          </div>
        );
      })}

      {showForm ? (
        <div className="space-y-2 pt-1 border-t border-border">
          <select
            value={predId}
            onChange={e => setPredId(e.target.value)}
            className="w-full h-7 rounded border border-border bg-bg px-2 text-[12px] text-fg"
          >
            <option value="">선행 태스크 선택...</option>
            {availablePreds.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <select
              value={depType}
              onChange={e => setDepType(e.target.value as GanttDependency['type'])}
              className="flex-1 h-7 rounded border border-border bg-bg px-2 text-[12px] text-fg"
            >
              {DEP_TYPES.map(t => (
                <option key={t} value={t}>{DEP_LABELS[t]}</option>
              ))}
            </select>
            <input
              type="number"
              value={lagDays}
              onChange={e => setLagDays(Number(e.target.value))}
              min={0}
              max={365}
              placeholder="지연(일)"
              className="w-20 h-7 rounded border border-border bg-bg px-2 text-[12px] text-fg"
            />
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!predId || create.isPending}
              className="flex-1 h-7 rounded bg-accent text-white text-[12px] font-medium disabled:opacity-50"
            >
              {create.isPending ? '추가 중...' : '추가'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-7 px-3 rounded border border-border text-[12px] text-fg-2 hover:bg-hover"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-[12px] text-accent hover:text-accent-strong"
        >
          <Plus size={12} /> 의존성 추가
        </button>
      )}
    </div>
  );
}
