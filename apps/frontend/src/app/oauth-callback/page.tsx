/**
 * /oauth-callback — landing route for Google/Outlook OAuth flows.
 *
 * The actual token exchange happens server-side in the next-auth handler;
 * this page only finalizes the UI state (writes provider connection to
 * localStorage so the calendar page can show the connected pill) and
 * navigates back to the calendar.
 */
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardBody } from '@/components/ui/primitives';

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const provider = (params?.get('provider') ?? 'google') as 'google' | 'outlook';
  const status = params?.get('status') === 'error' ? 'error' : 'success';

  useEffect(() => {
    if (status === 'success' && typeof window !== 'undefined') {
      const key = 'allflow.calendarLink';
      const stored = JSON.parse(window.localStorage.getItem(key) ?? '{}');
      stored[provider] = { connectedAt: new Date().toISOString() };
      window.localStorage.setItem(key, JSON.stringify(stored));
    }
    const timer = window.setTimeout(() => {
      router.replace('/calendar');
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [provider, status, router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-sm w-full">
        <CardBody className="space-y-2 text-center">
          <div className="text-[16px] font-bold text-fg">
            {status === 'success' ? '연결 완료' : '연결 실패'}
          </div>
          <div className="text-[12.5px] text-fg-2">
            {provider} 캘린더가 {status === 'success' ? '성공적으로 연결되었습니다' : '연결되지 못했습니다'}.
          </div>
          <div className="mt-2 text-[11px] text-fg-3">잠시 후 캘린더로 이동합니다…</div>
        </CardBody>
      </Card>
    </main>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-3">불러오는 중…</div>}>
      <CallbackInner />
    </Suspense>
  );
}
