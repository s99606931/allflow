/**
 * IssueCreateDialog — "새 이슈" 생성 다이얼로그 (FE-W4).
 */
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/primitives';
import { Dialog, DialogField, DialogFooter, Select, TextInput } from '@/components/ui/dialog';
import { useIssueMutations } from '@/lib/hooks/use-data';
import { PROJECTS, TEAM } from '@/lib/fixtures';
import type { IssuePrio, IssueSev } from '@/lib/schemas';

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

const SEV_OPTIONS: { value: IssueSev; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'med', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const PRIO_OPTIONS: IssuePrio[] = ['P0', 'P1', 'P2', 'P3'];

export function IssueCreateDialog({ open, onOpenChange }: Props) {
  const { create } = useIssueMutations();
  const firstProj = PROJECTS[0]?.id ?? '';
  const firstUser = TEAM[0]?.id ?? '';
  const [title, setTitle] = useState('');
  const [proj, setProj] = useState(firstProj);
  const [assignee, setAssignee] = useState(firstUser);
  const [reporter, setReporter] = useState(firstUser);
  const [sev, setSev] = useState<IssueSev>('med');
  const [prio, setPrio] = useState<IssuePrio>('P2');

  const reset = () => {
    setTitle('');
    setProj(firstProj);
    setAssignee(firstUser);
    setReporter(firstUser);
    setSev('med');
    setPrio('P2');
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !proj || !assignee || !reporter) return;
    await create.mutateAsync({
      title: title.trim(),
      proj,
      assignee,
      reporter,
      sev,
      prio,
      tags: [],
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="새 이슈" size="md">
      <form onSubmit={onSubmit} className="space-y-3">
        <DialogField label="제목" required>
          <TextInput value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
        </DialogField>
        <div className="grid grid-cols-2 gap-3">
          <DialogField label="프로젝트" required>
            <Select value={proj} onChange={e => setProj(e.target.value)} required>
              {PROJECTS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </DialogField>
          <DialogField label="담당자" required>
            <Select value={assignee} onChange={e => setAssignee(e.target.value)} required>
              {TEAM.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </DialogField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <DialogField label="보고자" required>
            <Select value={reporter} onChange={e => setReporter(e.target.value)} required>
              {TEAM.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </DialogField>
          <DialogField label="심각도">
            <Select value={sev} onChange={e => setSev(e.target.value as IssueSev)}>
              {SEV_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </DialogField>
          <DialogField label="우선순위">
            <Select value={prio} onChange={e => setPrio(e.target.value as IssuePrio)}>
              {PRIO_OPTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </DialogField>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? '등록 중…' : '등록'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
