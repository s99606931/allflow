/**
 * TaskCreateDialog — "새 태스크" 생성 다이얼로그.
 *
 * 사이드바 "새로 만들기" 메뉴 + 명령 팔레트 `new-task` 액션의
 * 공용 진입점. `useTaskMutations().create`로 BE에 위임한다.
 */
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/primitives';
import { Dialog, DialogField, DialogFooter, Select, TextInput } from '@/components/ui/dialog';
import { useTaskMutations, useProjects, useUsers } from '@/lib/hooks/use-data';
import type { Priority } from '@/lib/schemas';

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

const PRIO_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'high', label: '높음' },
  { value: 'med', label: '중간' },
  { value: 'low', label: '낮음' },
];

export function TaskCreateDialog({ open, onOpenChange }: Props) {
  const { create } = useTaskMutations();
  const { data: projects = [] } = useProjects();
  const { data: users = [] } = useUsers();
  const firstUser = users[0]?.id ?? '';
  const [title, setTitle] = useState('');
  const [proj, setProj] = useState('');
  const [assignee, setAssignee] = useState(firstUser);
  const [priority, setPriority] = useState<Priority>('med');
  const [due, setDue] = useState('');

  const reset = () => {
    setTitle('');
    setProj('');
    setAssignee(firstUser);
    setPriority('med');
    setDue('');
  };

  const projectId = proj || projects[0]?.id || '';

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !projectId || !assignee) return;
    await create.mutateAsync({
      title: title.trim(),
      proj: projectId,
      assignee,
      priority,
      due: due.trim() || undefined,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="새 태스크" size="md">
      <form onSubmit={onSubmit} className="space-y-3">
        <DialogField label="제목" required>
          <TextInput
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="무엇을 해야 하나요?"
            required
            autoFocus
          />
        </DialogField>
        <div className="grid grid-cols-2 gap-3">
          <DialogField label="프로젝트" required>
            <Select value={projectId} onChange={e => setProj(e.target.value)} required>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </DialogField>
          <DialogField label="담당자" required>
            <Select value={assignee} onChange={e => setAssignee(e.target.value)} required>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </DialogField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DialogField label="우선순위">
            <Select value={priority} onChange={e => setPriority(e.target.value as Priority)}>
              {PRIO_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </DialogField>
          <DialogField label="마감일" hint="예: 오늘 / 내일 / 2026-05-10">
            <TextInput value={due} onChange={e => setDue(e.target.value)} placeholder="" />
          </DialogField>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={create.isPending || !projectId}
          >
            {create.isPending ? '등록 중…' : '등록'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
