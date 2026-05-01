/**
 * ApprovalForm — modal dialog to file a new approval request.
 *
 * PDCA-04 / inventory 1.5.* — wires the "새 결재" button on the Approvals page
 * (and the Command Palette action) into `useApprovalMutations().create`.
 *
 * The form is intentionally minimal (title / kind / amount / single approver).
 * The richer multi-line editor lives in `ApprovalLineEditor` and can be
 * embedded via the optional `extraSlot` prop.
 */
'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/primitives';
import { Dialog, DialogField, DialogFooter, Select, TextInput, Textarea } from '@/components/ui/dialog';
import { useApprovalMutations, useUsers } from '@/lib/hooks/use-data';
import { useTranslation } from '@/lib/i18n';

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onSuccess?: () => void;
  extraSlot?: ReactNode;
}

const KINDS = ['leave', 'expense', 'purchase', 'general', 'overtime'] as const;

export function ApprovalForm({ open, onOpenChange, onSuccess, extraSlot }: Props) {
  const { t } = useTranslation();
  const { create } = useApprovalMutations();
  const { data: users = [] } = useUsers();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<(typeof KINDS)[number]>('general');
  const [approver, setApprover] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !approver) return;
    await create.mutateAsync({
      title: title.trim(),
      approver,
      amount: amount ? Number(amount.replace(/[^0-9.]/g, '')) : undefined,
      reason: reason.trim() || undefined,
    });
    setTitle('');
    setAmount('');
    setReason('');
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('approval.create.title')}
      description={`${t('approval.create.kind')} · ${t('approval.create.line')}`}
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <DialogField label={t('approval.create.titleField')} required>
          <TextInput
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="예: 4월 출장비 정산"
            required
            autoFocus
          />
        </DialogField>
        <div className="grid grid-cols-2 gap-3">
          <DialogField label={t('approval.create.kind')} required>
            <Select value={kind} onChange={e => setKind(e.target.value as typeof kind)}>
              {KINDS.map(k => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </DialogField>
          <DialogField label={t('approval.create.line')} required>
            <Select value={approver} onChange={e => setApprover(e.target.value)}>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </DialogField>
        </div>
        <DialogField label={t('approval.create.amount')} hint="숫자만 입력 (₩)">
          <TextInput
            value={amount}
            onChange={e => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
          />
        </DialogField>
        <DialogField label="사유">
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="결재 사유 / 첨부 메모"
          />
        </DialogField>
        {extraSlot}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? t('common.loading') : t('approval.create.submit')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
