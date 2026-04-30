/**
 * ResourceBookDialog — book a meeting room/equipment slot.
 *
 * PDCA-05 / inventory 5.4.* — wires the "예약" button on the Resources page.
 * Validates the slot against the same-day booking list passed by the parent
 * (the parent owns the BOOKINGS source) and surfaces a warning before the
 * mutation fires.
 */
'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/primitives';
import { Dialog, DialogField, DialogFooter, Select, TextInput } from '@/components/ui/dialog';
import { useMe, useResourceMutations } from '@/lib/hooks/use-data';
import { useTranslation } from '@/lib/i18n';

interface Slot {
  resourceId: string;
  start: string;
  end: string;
}

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  resources: { id: string; name: string }[];
  existingBookings?: Slot[];
}

export function ResourceBookDialog({ open, onOpenChange, resources, existingBookings = [] }: Props) {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const { create } = useResourceMutations();
  const today = new Date().toISOString().slice(0, 10);
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? '');
  const [start, setStart] = useState(`${today}T09:00`);
  const [end, setEnd] = useState(`${today}T10:00`);

  const conflict = useMemo(() => {
    return existingBookings.some(
      b => b.resourceId === resourceId && start < b.end && b.start < end,
    );
  }, [existingBookings, resourceId, start, end]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!resourceId) return;
    await create.mutateAsync({
      resourceId,
      start,
      end,
      bookedBy: me?.id ?? '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('resources.book.title')} size="sm">
      <form onSubmit={onSubmit} className="space-y-3">
        <DialogField label="리소스" required>
          <Select value={resourceId} onChange={e => setResourceId(e.target.value)} required>
            {resources.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
        </DialogField>
        <div className="grid grid-cols-2 gap-3">
          <DialogField label={t('resources.book.start')} required>
            <TextInput type="datetime-local" value={start} onChange={e => setStart(e.target.value)} required />
          </DialogField>
          <DialogField label={t('resources.book.end')} required>
            <TextInput type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} required />
          </DialogField>
        </div>
        {conflict && (
          <div role="alert" className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-[12px] text-danger">
            {t('resources.book.conflict')}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending || conflict}>
            {create.isPending ? t('common.loading') : t('resources.book')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
