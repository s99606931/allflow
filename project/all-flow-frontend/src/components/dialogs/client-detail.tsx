/**
 * ClientDetail — slide-over panel showing a single CRM account.
 *
 * Owns local activity state (mock backend) so the user can demo the full
 * lifecycle: add note → change stage → see timeline update.
 */
'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Avatar, Button, IconButton } from '@/components/ui/primitives';
import { Dialog, DialogField, DialogFooter, Select, Textarea } from '@/components/ui/dialog';
import { ActivityTimeline, type CrmActivity, type CrmStage } from './activity-timeline';
import { useTranslation } from '@/lib/i18n';
import { ME } from '@/lib/fixtures';

interface Props {
  client: { id: string | number; name: string; code: string; tier: string } | null;
  onClose: () => void;
}

const STAGE_OPTIONS: CrmStage[] = ['lead', 'qualified', 'active', 'churned'];

export function ClientDetail({ client, onClose }: Props) {
  const { t } = useTranslation();
  const [stage, setStage] = useState<CrmStage>('active');
  const [activities, setActivities] = useState<CrmActivity[]>([
    { id: 'a1', kind: 'meeting', at: '2일 전', by: '김지우', text: 'Q2 OKR 정합 미팅 — 다음 주 1차 검수 일정 확정', stage: 'active' },
    { id: 'a2', kind: 'call', at: '4일 전', by: '이서연', text: '결제 PG 우회 라우트 확인 콜' },
  ]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [draftKind, setDraftKind] = useState<CrmActivity['kind']>('note');
  const [draftText, setDraftText] = useState('');

  const stats = useMemo(
    () => [
      { label: 'MRR', value: '₩12M' },
      { label: 'ARR', value: '₩144M' },
      { label: '활동(7d)', value: String(activities.length) },
      { label: '단계', value: t(`crm.stage.${stage}`) },
    ],
    [activities.length, stage, t],
  );

  if (!client) return null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = draftText.trim();
    if (!text) return;
    setActivities(prev => [
      {
        id: `a-${Date.now()}`,
        kind: draftKind,
        at: '방금',
        by: ME.name,
        text,
      },
      ...prev,
    ]);
    setDraftText('');
    setComposeOpen(false);
  };

  const changeStage = (next: CrmStage) => {
    if (next === stage) return;
    setStage(next);
    setActivities(prev => [
      {
        id: `a-${Date.now()}`,
        kind: 'stage',
        at: '방금',
        by: ME.name,
        text: `단계 변경: ${t(`crm.stage.${stage}`)} → ${t(`crm.stage.${next}`)}`,
        stage: next,
      },
      ...prev,
    ]);
  };

  return (
    <>
      <Dialog open onOpenChange={open => !open && onClose()} title={client.name} description={client.code} size="lg">
        <div className="grid grid-cols-4 gap-3 border-b border-border pb-4">
          {stats.map(stat => (
            <div key={stat.label} className="rounded-md border border-border bg-bg-1 p-3">
              <div className="text-[10.5px] uppercase tracking-wider text-fg-3">{stat.label}</div>
              <div className="text-[18px] font-bold text-fg mono">{stat.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] uppercase tracking-wider text-fg-3 font-semibold">단계</span>
          {STAGE_OPTIONS.map(option => (
            <button
              key={option}
              type="button"
              aria-pressed={option === stage}
              onClick={() => changeStage(option)}
              className={`rounded-full border px-2.5 py-0.5 text-[11.5px] transition-colors ${
                option === stage
                  ? 'border-accent bg-accent-soft text-accent-strong font-semibold'
                  : 'border-border bg-bg-1 text-fg-2 hover:bg-hover'
              }`}
            >
              {t(`crm.stage.${option}`)}
            </button>
          ))}
          <div className="flex-1" />
          <Button type="button" size="sm" variant="primary" onClick={() => setComposeOpen(true)}>
            <Plus size={12} /> {t('crm.activity.add')}
          </Button>
        </div>
        <div className="mt-5">
          <ActivityTimeline items={activities} />
        </div>
        <DialogFooter>
          <Button type="button" variant="primary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen} title={t('crm.activity.add')} size="sm">
        <form onSubmit={onSubmit} className="space-y-3">
          <DialogField label="유형" required>
            <Select value={draftKind} onChange={e => setDraftKind(e.target.value as CrmActivity['kind'])}>
              <option value="note">{t('crm.activity.note')}</option>
              <option value="call">{t('crm.activity.call')}</option>
              <option value="meeting">{t('crm.activity.meeting')}</option>
            </Select>
          </DialogField>
          <DialogField label="내용" required>
            <Textarea value={draftText} onChange={e => setDraftText(e.target.value)} required autoFocus />
          </DialogField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setComposeOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
