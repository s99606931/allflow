'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/primitives';
import { Dialog, DialogField, DialogFooter, Select, TextInput } from '@/components/ui/dialog';
import { useTaskMutations, useUsers } from '@/lib/hooks/use-data';
import type { Priority, StatusKey, Task } from '@/lib/schemas';

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  task: Task;
}

const STATUS_OPTIONS: { value: StatusKey; label: string }[] = [
  { value: 'todo', label: '할 일' },
  { value: 'doing', label: '진행 중' },
  { value: 'review', label: '검토 중' },
  { value: 'done', label: '완료' },
  { value: 'blocked', label: '차단됨' },
];

const PRIO_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'high', label: '높음' },
  { value: 'med', label: '중간' },
  { value: 'low', label: '낮음' },
];

export function TaskEditDialog({ open, onOpenChange, task }: Props) {
  const { update } = useTaskMutations();
  const { data: users = [] } = useUsers();

  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<StatusKey>(task.status);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assignee);
  const [due, setDue] = useState(task.due ?? '');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await update.mutateAsync({
      id: task.id,
      patch: {
        title: title.trim(),
        status,
        priority,
        assigneeId,
        due: due.trim() || undefined,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="태스크 수정" size="md">
      <form onSubmit={onSubmit} className="space-y-3">
        <DialogField label="제목" required>
          <TextInput value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
        </DialogField>
        <div className="grid grid-cols-2 gap-3">
          <DialogField label="상태">
            <Select value={status} onChange={e => setStatus(e.target.value as StatusKey)}>
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </DialogField>
          <DialogField label="우선순위">
            <Select value={priority} onChange={e => setPriority(e.target.value as Priority)}>
              {PRIO_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </DialogField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DialogField label="담당자">
            <Select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </DialogField>
          <DialogField label="마감일">
            <TextInput value={due} onChange={e => setDue(e.target.value)} placeholder="2026-05-30" />
          </DialogField>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={update.isPending}>
            {update.isPending ? '저장 중…' : '저장'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
