'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/primitives';
import { DateInput, Dialog, DialogField, DialogFooter, TextInput, Select } from '@/components/ui/dialog';
import { useProjectMutations } from '@/lib/hooks/use-data';
import type { Project } from '@/lib/schemas';

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  project: Project;
}

const STATUS_OPTIONS = [
  { value: 'todo', label: '대기' },
  { value: 'doing', label: '진행' },
  { value: 'review', label: '검토' },
  { value: 'done', label: '완료' },
  { value: 'blocked', label: '차단' },
] as const;

export function ProjectEditDialog({ open, onOpenChange, project }: Props) {
  const { update } = useProjectMutations();
  const [name, setName] = useState(project.name);
  const [color, setColor] = useState(project.color);
  const [due, setDue] = useState(project.due ?? '');
  const [status, setStatus] = useState(project.status);
  const [progress, setProgress] = useState(String(project.progress));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await update.mutateAsync({
      id: project.id,
      patch: {
        name: name.trim() || undefined,
        color: color || undefined,
        due: due.trim() || undefined,
        status: status || undefined,
        progress: progress !== '' ? Number(progress) : undefined,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="프로젝트 수정" size="sm">
      <form onSubmit={onSubmit} className="space-y-3">
        <DialogField label="프로젝트명" required>
          <TextInput value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </DialogField>
        <div className="grid grid-cols-2 gap-3">
          <DialogField label="상태">
            <Select value={status} onChange={e => setStatus(e.target.value as typeof status)}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </DialogField>
          <DialogField label="진행률 (0-100)">
            <TextInput
              type="number"
              min="0"
              max="100"
              value={progress}
              onChange={e => setProgress(e.target.value)}
              className="mono"
            />
          </DialogField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DialogField label="마감일">
            <DateInput value={due} onChange={e => setDue(e.target.value)} />
          </DialogField>
          <DialogField label="색상">
            <input
              type="color"
              aria-label="프로젝트 색상"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="h-9 w-full rounded border border-border"
            />
          </DialogField>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button type="submit" variant="primary" disabled={update.isPending}>
            {update.isPending ? '저장 중…' : '저장'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
