/**
 * EventCreateDialog — quick "일정 추가" sheet for the calendar view.
 *
 * PDCA-05 / inventory 1.6.* — wires the "일정 추가" button + Cmd-K action
 * into `useEventMutations().create`. Performs a client-side conflict check
 * against the supplied `existingEvents` list to surface overlaps before
 * the request is fired (the backend re-validates).
 */
'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/primitives';
import { Dialog, DialogField, DialogFooter, TextInput, Textarea } from '@/components/ui/dialog';
import { useEventMutations, useUsers } from '@/lib/hooks/use-data';
import { useTranslation } from '@/lib/i18n';
import type { Event } from '@/lib/schemas';

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  existingEvents?: Pick<Event, 'start' | 'end' | 'attendees'>[];
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function EventCreateDialog({ open, onOpenChange, existingEvents = [] }: Props) {
  const { t } = useTranslation();
  const { create } = useEventMutations();
  const { data: users = [] } = useUsers();
  const [title, setTitle] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(`${today}T09:00`);
  const [end, setEnd] = useState(`${today}T10:00`);
  const [location, setLocation] = useState('');
  const [attendees, setAttendees] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const conflict = useMemo(() => {
    const conflictAttendees = new Set<string>();
    for (const event of existingEvents) {
      if (!overlaps(start, end, event.start, event.end)) continue;
      for (const a of attendees) if (event.attendees.includes(a)) conflictAttendees.add(a);
    }
    return conflictAttendees;
  }, [start, end, attendees, existingEvents]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      start,
      end,
      location: location.trim() || undefined,
      attendees,
    });
    setTitle('');
    setNotes('');
    onOpenChange(false);
  };

  const toggleAttendee = (id: string) => {
    setAttendees(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('schedule.create.title')}>
      <form onSubmit={onSubmit} className="space-y-3">
        <DialogField label={t('approval.create.titleField')} required>
          <TextInput value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
        </DialogField>
        <div className="grid grid-cols-2 gap-3">
          <DialogField label={t('schedule.create.start')} required>
            <TextInput type="datetime-local" value={start} onChange={e => setStart(e.target.value)} required />
          </DialogField>
          <DialogField label={t('schedule.create.end')} required>
            <TextInput type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} required />
          </DialogField>
        </div>
        <DialogField label={t('schedule.create.location')}>
          <TextInput value={location} onChange={e => setLocation(e.target.value)} placeholder="회의실 (오로라)" />
        </DialogField>
        <DialogField label={t('schedule.create.attendees')}>
          <div className="flex flex-wrap gap-1">
            {users.map(user => {
              const active = attendees.includes(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleAttendee(user.id)}
                  className={`rounded-full border px-2 py-0.5 text-[11.5px] transition-colors ${
                    active
                      ? 'border-accent bg-accent-soft text-accent-strong'
                      : 'border-border bg-bg-1 text-fg-2 hover:bg-hover'
                  }`}
                >
                  {user.name}
                </button>
              );
            })}
          </div>
        </DialogField>
        {conflict.size > 0 && (
          <div role="alert" className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-[12px] text-warning">
            {t('schedule.conflict')} — {Array.from(conflict).join(', ')}
          </div>
        )}
        <DialogField label="메모">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="안건 / 자료 링크" />
        </DialogField>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? t('common.loading') : t('common.create')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
