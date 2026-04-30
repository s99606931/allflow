/**
 * ActivityTimeline — vertical CRM activity log (note / call / meeting).
 *
 * Pure presentational + stage transition pill. Add-activity is handled by
 * the parent (ClientDetail) so the same timeline can be reused for projects.
 */
'use client';

import { CheckCircle2, MessageSquare, Phone, Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export type CrmStage = 'lead' | 'qualified' | 'active' | 'churned';

export interface CrmActivity {
  id: string;
  kind: 'note' | 'call' | 'meeting' | 'stage';
  at: string;
  by: string;
  text: string;
  stage?: CrmStage;
}

interface Props {
  items: CrmActivity[];
}

const KIND_ICON = {
  note: MessageSquare,
  call: Phone,
  meeting: Users,
  stage: CheckCircle2,
} as const;

export function ActivityTimeline({ items }: Props) {
  const { t } = useTranslation();
  return (
    <ol className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
      {items.map(item => {
        const Icon = KIND_ICON[item.kind];
        return (
          <li key={item.id} className="relative">
            <span className="absolute -left-6 top-0 grid h-5 w-5 place-items-center rounded-full border border-border bg-bg-elev text-fg-2">
              <Icon size={11} />
            </span>
            <div className="text-[12.5px] text-fg-1">{item.text}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-3">
              <span>{item.by}</span>
              <span>·</span>
              <span className="mono">{item.at}</span>
              {item.stage && (
                <span className="rounded-full border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-accent-strong">
                  {t(`crm.stage.${item.stage}`)}
                </span>
              )}
            </div>
          </li>
        );
      })}
      {items.length === 0 && <li className="text-[12px] text-fg-3">아직 활동 기록이 없습니다</li>}
    </ol>
  );
}
