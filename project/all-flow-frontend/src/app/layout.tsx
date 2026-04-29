import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'ALL-Flow — 사내 협업 시스템',
  description: 'AI-First 사내 협업 · 업무 · 보고 자동화 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
