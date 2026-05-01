/**
 * ProjectCreateDialog — "새 프로젝트" 생성 다이얼로그 (1.2.1).
 */
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/primitives';
import { Dialog, DialogField, DialogFooter, TextInput } from '@/components/ui/dialog';
import { useProjectMutations } from '@/lib/hooks/use-data';

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

export function ProjectCreateDialog({ open, onOpenChange }: Props) {
  const { create } = useProjectMutations();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [due, setDue] = useState('');

  const reset = () => {
    setName('');
    setCode('');
    setColor('#3B82F6');
    setDue('');
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !code.trim()) return;
    await create.mutateAsync({
      name: name.trim(),
      code: code.trim(),
      color,
      due: due.trim() || undefined,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="새 프로젝트" size="sm">
      <form onSubmit={onSubmit} className="space-y-3">
        <DialogField label="프로젝트명" required>
          <TextInput value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </DialogField>
        <div className="grid grid-cols-2 gap-3">
          <DialogField label="코드" required hint="예: PRJ-001">
            <TextInput
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              required
              className="mono"
            />
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
        <DialogField label="마감일" hint="선택">
          <input
            type="date"
            aria-label="마감일"
            value={due}
            onChange={e => setDue(e.target.value)}
            className="h-9 w-full rounded border border-border px-2 text-[13px] bg-surface text-fg"
          />
        </DialogField>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? '생성 중…' : '생성'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
