'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/ui-store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  const theme = useUIStore(s => s.theme);
  const accent = useUIStore(s => s.accent);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', accent);
  }, [theme, accent]);

  return (
    <SessionProvider>
      <QueryClientProvider client={client}>
        {children}
        <Toaster position="top-right" />
      </QueryClientProvider>
    </SessionProvider>
  );
}
