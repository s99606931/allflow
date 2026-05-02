'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/ui-store';

const FONT_SIZE_MAP: Record<string, string> = {
  '작게 (90%)': '90%',
  '표준 (100%)': '100%',
  '크게 (110%)': '110%',
  '매우 크게 (120%)': '120%',
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  const theme = useUIStore(s => s.theme);
  const accent = useUIStore(s => s.accent);
  const compact = useUIStore(s => s.compact);
  const reduceMotion = useUIStore(s => s.reduceMotion);
  const fontSize = useUIStore(s => s.fontSize);

  useEffect(() => {
    const resolvedTheme = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.setAttribute('data-accent', accent);
    document.documentElement.setAttribute('data-compact', compact ? 'true' : 'false');
    document.documentElement.setAttribute('data-reduce-motion', reduceMotion ? 'true' : 'false');
    document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize] ?? '100%';
  }, [theme, accent, compact, reduceMotion, fontSize]);

  return (
    <SessionProvider>
      <QueryClientProvider client={client}>
        {children}
        <Toaster position="top-right" />
      </QueryClientProvider>
    </SessionProvider>
  );
}
