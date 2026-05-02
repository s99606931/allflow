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
import { DateTimeInput, Dialog, DialogField, DialogFooter, Select } from '@/components/ui/dialog';
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
  initialResourceId?: string;
  initialStart?: string;
}

export function ResourceBookDialog({ open, onOpenChange, resources, existingBookings = [], initialResourceId, initialStart }: Props) {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const { create } = useResourceMutations();
  const today = new Date().toISOString().slice(0, 10);
  const [resourceId, setResourceId] = useState(initialResourceId ?? resources[0]?.id ?? '');
  const [start, setStart] = useState(initialStart ?? `${today}T09:00`);
  const [end, setEnd] = useState(() => {
    if (initialStart) {
      const d = new Date(initialStart);
      d.setHours(d.getHours() + 1);
      return d.toISOString().slice(0, 16);
    }
    return `${today}T10:00`;
  });

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
            <DateTimeInput value={start} onChange={e => setStart(e.target.value)} required />
          </DialogField>
          <DialogField label={t('resources.book.end')} required>
            <DateTimeInput value={end} onChange={e => setEnd(e.target.value)} required />
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
