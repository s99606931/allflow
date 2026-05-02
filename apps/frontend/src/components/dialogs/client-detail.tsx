'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/primitives';
import { Dialog, DialogField, DialogFooter, Select, Textarea } from '@/components/ui/dialog';
import { ActivityTimeline, type CrmActivity, type CrmStage } from './activity-timeline';
import { useTranslation } from '@/lib/i18n';
import { useClientActivities, useCreateClientActivity, useMe } from '@/lib/hooks/use-data';

interface Props {
  client: { id: string | number; name: string; code: string; tier: string } | null;
  onClose: () => void;
}

const STAGE_OPTIONS: CrmStage[] = ['lead', 'qualified', 'active', 'churned'];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export function ClientDetail({ client, onClose }: Props) {
  const clientId = client ? String(client.id) : null;
  const { data: me } = useMe();
  const { t } = useTranslation();
  const [stage, setStage] = useState<CrmStage>('active');
  const [stageActivities, setStageActivities] = useState<CrmActivity[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [draftKind, setDraftKind] = useState<'note' | 'call' | 'meeting' | 'email'>('note');
  const [draftText, setDraftText] = useState('');

  const { data: apiActivities = [] } = useClientActivities(clientId);
  const createActivity = useCreateClientActivity(clientId);

  const activities: CrmActivity[] = useMemo(() => {
    const fromApi: CrmActivity[] = apiActivities.map(a => ({
      id: a.id,
      kind: a.kind as CrmActivity['kind'],
      at: relativeTime(a.createdAt),
      by: a.author.name,
      text: a.text,
    }));
    return [...stageActivities, ...fromApi].sort((a, b) => {
      if (a.kind === 'stage' && b.kind !== 'stage') return -1;
      if (b.kind === 'stage' && a.kind !== 'stage') return 1;
      return 0;
    });
  }, [apiActivities, stageActivities]);

  const stats = useMemo(
    () => [
      { label: '업종', value: client?.tier ?? '—' },
      { label: '활동', value: `${apiActivities.length}건` },
      { label: '단계', value: t(`crm.stage.${stage}`) },
    ],
    [apiActivities.length, client?.tier, stage, t],
  );

  if (!client) return null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const text = draftText.trim();
    if (!text) return;
    await createActivity.mutateAsync({ kind: draftKind, text });
    setDraftText('');
    setComposeOpen(false);
  };

  const changeStage = (next: CrmStage) => {
    if (next === stage) return;
    setStageActivities(prev => [
      {
        id: `stage-${Date.now()}`,
        kind: 'stage',
        at: '방금',
        by: me?.name ?? '—',
        text: `단계 변경: ${t(`crm.stage.${stage}`)} → ${t(`crm.stage.${next}`)}`,
        stage: next,
      },
      ...prev,
    ]);
    setStage(next);
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
            <Select value={draftKind} onChange={e => setDraftKind(e.target.value as typeof draftKind)}>
              <option value="note">{t('crm.activity.note')}</option>
              <option value="call">{t('crm.activity.call')}</option>
              <option value="meeting">{t('crm.activity.meeting')}</option>
              <option value="email">이메일</option>
            </Select>
          </DialogField>
          <DialogField label="내용" required>
            <Textarea value={draftText} onChange={e => setDraftText(e.target.value)} required autoFocus />
          </DialogField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setComposeOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={createActivity.isPending}>
              {createActivity.isPending ? '저장 중...' : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
