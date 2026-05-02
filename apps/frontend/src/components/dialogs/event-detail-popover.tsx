/**
 * EventDetailPopover — small Dialog showing a single event's details.
 *
 * Used as the "click an event in the calendar grid" interaction.
 */
'use client';

import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { Avatar, Button } from '@/components/ui/primitives';
import { Dialog, DialogFooter, TextInput } from '@/components/ui/dialog';
import { useUsers, useEventMutations } from '@/lib/hooks/use-data';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

export interface EventLike {
  id?: string;
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
  const { remove, update } = useEventMutations();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(event?.title ?? '');

  if (!event) return null;

  const attendees = users.filter(u => event.attendees.includes(u.id));
  const canEdit = Boolean(event.id) && event.source !== 'google' && event.source !== 'outlook';

  const handleSave = () => {
    update.mutate(
      { id: event.id!, patch: { title: editTitle } },
      { onSuccess: () => { setEditing(false); onClose(); } },
    );
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()} title={editing ? '일정 수정' : event.title} size="sm">
      <div className="space-y-3 text-[13px] text-fg-1">
        {editing ? (
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-fg-3">제목</label>
            <TextInput
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              autoFocus
            />
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
      <DialogFooter>
        {editing ? (
          <>
            <Button type="button" variant="secondary" onClick={() => { setEditing(false); setEditTitle(event.title); }}>
              취소
            </Button>
            <Button type="button" variant="primary" disabled={update.isPending} onClick={handleSave}>
              {update.isPending ? '저장 중...' : '저장'}
            </Button>
          </>
        ) : (
          <>
            {canEdit && (
              <Button type="button" variant="secondary" onClick={() => { setEditTitle(event.title); setEditing(true); }}>
                <Edit2 size={14} className="mr-1" />
                수정
              </Button>
            )}
            {canEdit && (
              <Button
                type="button"
                variant="danger"
                disabled={remove.isPending}
                onClick={() => toast(`"${event.title}" 일정을 삭제하시겠습니까?`, { action: { label: '삭제', onClick: () => remove.mutate(event.id!, { onSuccess: onClose }) }, cancel: '취소' })}
              >
                {remove.isPending ? '삭제 중...' : '삭제'}
              </Button>
            )}
            <Button type="button" variant="primary" onClick={onClose}>
              {t('common.close')}
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}
