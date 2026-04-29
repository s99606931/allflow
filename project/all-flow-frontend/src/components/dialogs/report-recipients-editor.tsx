/**
 * ReportRecipientsEditor — pick the email list before firing a send.
 *
 * Goes through `useReportSend()` → `api.sendReport()` so cache + toast policy
 * stays on the central data layer (FE-W9).
 */
'use client';

import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/primitives';
import { Dialog, DialogField, DialogFooter, TextInput } from '@/components/ui/dialog';
import { useTranslation } from '@/lib/i18n';
import { useReportSend } from '@/lib/hooks/use-data';

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  reportId: string;
  defaultRecipients?: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ReportRecipientsEditor({ open, onOpenChange, reportId, defaultRecipients = [] }: Props) {
  const { t } = useTranslation();
  const send = useReportSend();
  const [recipients, setRecipients] = useState<string[]>(defaultRecipients);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | undefined>();

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (!EMAIL_RE.test(value)) {
      setError('올바른 이메일 주소를 입력하세요');
      return;
    }
    if (recipients.includes(value)) {
      setError('이미 추가된 주소입니다');
      return;
    }
    setRecipients(prev => [...prev, value]);
    setDraft('');
    setError(undefined);
  };

  const remove = (email: string) => setRecipients(prev => prev.filter(r => r !== email));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (recipients.length === 0) {
      setError('수신자를 한 명 이상 추가하세요');
      return;
    }
    try {
      await send.mutateAsync({ id: reportId, recipients });
      onOpenChange(false);
    } catch {
      // central onError already toasts via useReportSend
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('reports.send.title')} size="sm">
      <form onSubmit={onSubmit} className="space-y-3">
        <DialogField label={t('reports.send.email')} required hint="Enter 또는 추가 버튼" error={error}>
          <div className="flex gap-2">
            <TextInput
              type="email"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="exec@allflow.io"
            />
            <Button type="button" variant="secondary" onClick={add}>
              <Plus size={12} /> {t('reports.send.add')}
            </Button>
          </div>
        </DialogField>
        <ul className="flex flex-wrap gap-1.5">
          {recipients.map(email => (
            <li
              key={email}
              className="flex items-center gap-1.5 rounded-full border border-border bg-bg-1 px-2 py-0.5 text-[12px]"
            >
              {email}
              <IconButton size="sm" type="button" aria-label={`${email} 제거`} onClick={() => remove(email)}>
                <X size={11} />
              </IconButton>
            </li>
          ))}
          {recipients.length === 0 && <li className="text-[12px] text-fg-3">아직 수신자가 없습니다</li>}
        </ul>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={send.isPending}>
            {send.isPending ? t('common.loading') : t('reports.send.confirm')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
