/**
 * IssueEditDialog — 이슈 수정 다이얼로그.
 */
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/primitives';
import { Dialog, DialogField, DialogFooter, Select, TextInput } from '@/components/ui/dialog';
import { useIssueMutations } from '@/lib/hooks/use-data';
import type { IssuePrio, IssueSev } from '@/lib/schemas';

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  issue: { id: string; title: string; sev: string; prio: string };
}

const SEV_OPTIONS: { value: IssueSev; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'med', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const PRIO_OPTIONS: IssuePrio[] = ['P0', 'P1', 'P2', 'P3'];

export function IssueEditDialog({ open, onOpenChange, issue }: Props) {
  const { update } = useIssueMutations();
  const [title, setTitle] = useState(issue.title);
  const [sev, setSev] = useState<IssueSev>(issue.sev as IssueSev);
  const [prio, setPrio] = useState<IssuePrio>(issue.prio as IssuePrio);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await update.mutateAsync({ id: issue.id, patch: { title: title.trim(), sev, prio } });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="이슈 수정" size="md">
      <form onSubmit={onSubmit} className="space-y-3">
        <DialogField label="제목" required>
          <TextInput value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
        </DialogField>
        <div className="grid grid-cols-2 gap-3">
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
          <Button type="submit" variant="primary" disabled={update.isPending}>
            {update.isPending ? '저장 중…' : '저장'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
