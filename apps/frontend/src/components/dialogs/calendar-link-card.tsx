/**
 * CalendarLinkCard — small cluster of "Connect Google / Outlook" buttons.
 *
 * Reads the connection state from localStorage (written by `oauth-callback`)
 * so the same card serves both pre- and post-connect UX without a backend call.
 */
'use client';

import { useState } from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/primitives';
import { useTranslation } from '@/lib/i18n';

interface LinkState {
  google?: { connectedAt: string };
  outlook?: { connectedAt: string };
}

const STORAGE_KEY = 'allflow.calendarLink';

export function CalendarLinkCard() {
  const { t } = useTranslation();
  const [state] = useState<LinkState>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}'); }
    catch { return {}; }
  });

  const start = (provider: 'google' | 'outlook') => {
    // Mock OAuth: in production we'd `window.location.href = '/api/auth/<provider>'`.
    // For now we send the user straight to the success callback.
    window.location.assign(`/oauth-callback?provider=${provider}&status=success`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-bg-elev p-3">
      <Calendar size={14} className="text-fg-3" />
      <span className="text-[12.5px] font-semibold text-fg">외부 캘린더</span>
      {(['google', 'outlook'] as const).map(provider => {
        const connected = Boolean(state[provider]);
        return (
          <Button
            key={provider}
            type="button"
            size="sm"
            variant={connected ? 'secondary' : 'primary'}
            onClick={() => start(provider)}
            aria-label={t(provider === 'google' ? 'schedule.oauth.google' : 'schedule.oauth.outlook')}
          >
            {connected && <CheckCircle2 size={12} />}
            {provider === 'google' ? 'Google' : 'Outlook'}
            {connected && <span className="text-[10.5px]">· {t('schedule.oauth.connected')}</span>}
          </Button>
        );
      })}
    </div>
  );
}
