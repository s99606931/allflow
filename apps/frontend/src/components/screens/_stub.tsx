'use client';

import { Card, CardBody } from '@/components/ui/primitives';
import { useUIStore } from '@/store/ui-store';
import type { Accent } from '@/lib/tokens';
import { ACCENTS } from '@/lib/tokens';
import { Moon, Settings2, Sun, X } from 'lucide-react';
import { useState } from 'react';

export function PageStub({ title, body }: { title: string; body?: string }) {
  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      <Card>
        <CardBody className="py-16 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-bg-2 grid place-items-center mb-4">
            <Settings2 size={20} className="text-fg-3" />
          </div>
          <div className="text-[15px] font-semibold text-fg">{title}</div>
          <p className="text-[12.5px] text-fg-2 mt-1">{body ?? '이 화면은 디자인 캔버스에서 모킹되었으며, 본 코드 패키지는 셸 + 대시보드 + 프로젝트 + 이슈를 우선 구현합니다.'}</p>
        </CardBody>
      </Card>
    </div>
  );
}

export function TweaksFloating() {
  const [open, setOpen] = useState(false);
  const { theme, accent, setTheme, setAccent } = useUIStore();

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 left-6 z-50 w-11 h-11 rounded-full bg-fg text-bg shadow-pop grid place-items-center hover:scale-105 transition-transform"
        aria-label="Tweaks"
      >
        <Settings2 size={16} />
      </button>
      {open && (
        <div className="fixed bottom-20 left-6 z-50 w-72 bg-bg-elev border border-border rounded-xl shadow-pop p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold text-fg">Tweaks</div>
            <button onClick={() => setOpen(false)} className="text-fg-3 hover:text-fg-1"><X size={14} /></button>
          </div>
          <div className="space-y-2">
            <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold">테마</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { v: 'light' as const, label: '라이트', icon: Sun },
                { v: 'dark' as const, label: '다크', icon: Moon },
              ].map(({ v, label, icon: Icon }) => (
                <button
                  key={v}
                  onClick={() => setTheme(v)}
                  className={`flex items-center justify-center gap-1.5 h-8 rounded-md border text-[12px] font-medium transition-colors ${
                    theme === v ? 'border-accent bg-accent-soft text-accent-strong' : 'border-border text-fg-1 hover:bg-hover'
                  }`}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold">액센트</div>
            <div className="grid grid-cols-6 gap-1.5">
              {ACCENTS.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAccent(a.id as Accent)}
                  className={`h-8 rounded-md border-2 transition-all ${accent === a.id ? 'border-fg scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ background: a.hex }}
                  aria-label={a.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
