/**
 * EventDetailPopover — small Dialog showing a single event's details.
 *
 * Used as the "click an event in the calendar grid" interaction.
 */
'use client';

import { Avatar, Button } from '@/components/ui/primitives';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { useUsers } from '@/lib/hooks/use-data';
import { useTranslation } from '@/lib/i18n';

export interface EventLike {
  title: string;
  start: string;
  end: string;
  attendees: string[];
  location?: string;
  source?: 'internal' | 'google' | 'outlook';
}

interface Props {
  event: EventLike | null;
  onClose: () => void;
}

export function EventDetailPopover({ event, onClose }: Props) {
  const { t } = useTranslation();
  const { data: users = [] } = useUsers();
  if (!event) return null;
  const attendees = users.filter(u => event.attendees.includes(u.id));
  return (
    <Dialog open onOpenChange={open => !open && onClose()} title={event.title} size="sm">
      <div className="space-y-3 text-[13px] text-fg-1">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-fg-3">{t('schedule.create.start')} — {t('schedule.create.end')}</div>
          <div className="mono text-[12.5px]">{event.start} → {event.end}</div>
        </div>
        {event.location && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-fg-3">{t('schedule.create.location')}</div>
            <div>{event.location}</div>
          </div>
        )}
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wider text-fg-3">{t('schedule.create.attendees')}</div>
          <div className="flex flex-wrap gap-1.5">
            {attendees.map(u => (
              <div key={u.id} className="flex items-center gap-1.5 rounded-full border border-border bg-bg-1 px-2 py-0.5 text-[12px]">
                <Avatar user={u} size={16} />
                <span>{u.name}</span>
              </div>
            ))}
            {attendees.length === 0 && <span className="text-fg-3 text-[12px]">없음</span>}
          </div>
        </div>
        {event.source && event.source !== 'internal' && (
          <div className="text-[11px] text-fg-3">출처: {event.source}</div>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="primary" onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
