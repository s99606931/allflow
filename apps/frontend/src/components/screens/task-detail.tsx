'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Avatar, Badge, Button, IconButton, StatusDot } from '@/components/ui/primitives';
import { CommentThread } from '@/components/comments/comment-thread';
import { TaskEditDialog } from '@/components/dialogs/task-edit-dialog';
import { useProjects, useTasks, useTaskMutations } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Circle,
  Flag,
  Link2,
  Loader2,
  Pencil,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface TaskDetailProps {
  taskId: string | null;
  onClose: () => void;
}

export function TaskDetailDialog({ taskId, onClose }: TaskDetailProps) {
  const [editOpen, setEditOpen] = useState(false);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: projects = [] } = useProjects();
  const userMap = useUserMap();
  const { remove: removeTask } = useTaskMutations();

  const task = taskId ? tasks.find(t => t.id === taskId) : undefined;
  const proj = task ? projects.find(p => p.id === task.proj) : undefined;
  const assignee = task ? userMap.get(task.assignee) : undefined;
  const subTasks = task ? tasks.filter(t => t.parentTaskId === task.id) : [];
  const subDone = subTasks.filter(s => s.status === 'done').length;

  return (
    <>
    <Dialog.Root open={!!taskId} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 fade-in" />
        <Dialog.Content className="fixed top-0 right-0 h-screen w-[720px] max-w-[100vw] bg-bg-elev border-l border-border z-50 shadow-pop flex flex-col fade-in">
          {/* Header */}
          <div className="h-14 px-5 border-b border-border flex items-center gap-2.5 shrink-0">
            {proj && (
              <span className="px-1.5 h-5 rounded text-[10px] mono font-bold text-white" style={{ background: proj.color }}>
                {proj.code}
              </span>
            )}
            <span className="mono text-[12px] text-fg-3">{taskId ?? ''}</span>
            <div className="flex-1" />
            <IconButton size="sm" aria-label="링크 복사" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/tasks?id=${taskId ?? ''}`); toast.success('링크가 복사되었습니다.'); }}><Link2 size={14} /></IconButton>
            <IconButton size="sm" aria-label="외부 열기" onClick={() => window.open(`/tasks?id=${taskId ?? ''}`, '_blank', 'noopener,noreferrer')}><ArrowUpRight size={14} /></IconButton>
            {task && (
              <IconButton size="sm" aria-label="태스크 수정" onClick={() => setEditOpen(true)}>
                <Pencil size={14} />
              </IconButton>
            )}
            {taskId && (
              <IconButton
                size="sm"
                aria-label="태스크 삭제"
                className="text-danger hover:bg-danger/10"
                disabled={removeTask.isPending}
                onClick={() => {
                  if (!window.confirm('이 태스크를 삭제하시겠습니까?')) return;
                  removeTask.mutate(taskId, { onSuccess: onClose });
                }}
              >
                <Trash2 size={14} />
              </IconButton>
            )}
            <Dialog.Close asChild>
              <IconButton size="sm" aria-label="닫기"><X size={14} /></IconButton>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto scroll p-6 space-y-6">
            {tasksLoading && !task && (
              <div className="flex items-center gap-2 text-fg-2 text-[12.5px]">
                <Loader2 size={14} className="animate-spin" /> 태스크 불러오는 중…
              </div>
            )}

            {!tasksLoading && !task && taskId && (
              <div className="text-center text-fg-3 text-[13px] py-12">
                태스크 <span className="mono">{taskId}</span> 를 찾을 수 없습니다.
                <div className="mt-3">
                  <Button variant="secondary" size="sm" onClick={onClose}>닫기</Button>
                </div>
              </div>
            )}

            {task && (
              <>
                {/* Title */}
                <div>
                  <h2 className="text-[20px] font-bold text-fg leading-tight">{task.title}</h2>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <StatusDot status={task.status} />
                    <span className="text-fg-3">·</span>
                    {task.priority === 'high' && <Badge tone="danger"><Flag size={10} /> 높음</Badge>}
                    {task.priority === 'med' && <Badge tone="warning"><Flag size={10} /> 중간</Badge>}
                    {task.priority === 'low' && <Badge tone="neutral"><Flag size={10} /> 낮음</Badge>}
                    {task.tags.map(t => (
                      <span key={t} className="text-[11px] px-1.5 py-0.5 rounded bg-bg-2 text-fg-2 inline-flex items-center gap-1">
                        <Tag size={9} /> {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI summary */}
                <div className="rounded-lg bg-accent-soft border border-accent/20 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-accent text-accent-fg grid place-items-center shrink-0">
                      <Sparkles size={13} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[12px] font-semibold text-accent-strong mb-1">AI 컨텍스트 요약</div>
                      <p className="text-[12.5px] text-fg-1 leading-relaxed">
                        {proj ? `${proj.name} 프로젝트의 태스크입니다. ` : ''}
                        현재 상태는 <strong>{task.status}</strong>이며,
                        {task.due ? <> 마감일은 <strong className="mono">{task.due}</strong></> : <> 마감일이 설정되지 않았습니다</>}.
                        {subTasks.length > 0 && <> 하위 태스크 {subDone}/{subTasks.length}개 완료.</>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Properties */}
                <div className="grid grid-cols-2 gap-3">
                  <Prop label="담당자" value={assignee ? (
                    <span className="flex items-center gap-2"><Avatar user={assignee} size={20} /><span className="text-[13px] text-fg">{assignee.name}</span></span>
                  ) : <span className="text-[13px] text-fg-3">미할당</span>} />
                  <Prop label="마감" icon={Calendar} value={<span className="text-[13px] text-fg mono">{task.due || '—'}</span>} />
                  <Prop label="프로젝트" value={proj ? (
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: proj.color }} />{proj.name}</span>
                  ) : <span className="text-[13px] text-fg-3">—</span>} />
                  <Prop label="진행률" value={<span className="text-[13px] text-fg mono">{task.progress ?? 0}%</span>} />
                </div>

                {/* Sub-tasks */}
                <Section title={`하위 태스크 (${subDone}/${subTasks.length})`}>
                  {subTasks.length === 0 ? (
                    <div className="text-[12px] text-fg-3 px-2 py-1.5">하위 태스크가 없습니다.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {subTasks.map(s => {
                        const u = userMap.get(s.assignee);
                        const isDone = s.status === 'done';
                        return (
                          <div key={s.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-hover">
                            {isDone ? <CheckCircle2 size={15} className="text-success" /> : <Circle size={15} className="text-fg-3" />}
                            <span className={`flex-1 text-[12.5px] ${isDone ? 'text-fg-3 line-through' : 'text-fg-1'}`}>{s.title}</span>
                            {u && <Avatar user={u} size={18} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Section>

                <Section title="댓글">
                  <CommentThread kind="task" parentId={task.id} />
                </Section>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    {task && (
      <TaskEditDialog open={editOpen} onOpenChange={setEditOpen} task={task} />
    )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

function Prop({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="rounded-md border border-border bg-bg-1 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10.5px] text-fg-3 uppercase tracking-wider font-semibold mb-1">
        {Icon && <Icon size={11} />}
        {label}
      </div>
      <div className="text-[13px] text-fg">{value}</div>
    </div>
  );
}
