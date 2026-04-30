'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Avatar, Badge, Button } from '@/components/ui/primitives';
import { Building2, ChevronRight, MapPin, Plus, Search, TrendingUp } from 'lucide-react';
import { ClientForm } from '@/components/dialogs/client-form';
import { ClientDetail } from '@/components/dialogs/client-detail';

const CLIENTS = [
  { id: 1, name: 'CJ ENM', code: 'CJ', tier: '진행', mrr: 12_000, arr: 144_000, projects: 3, contacts: 8, last: '2일 전', health: 92 },
  { id: 2, name: '카카오엔터테인먼트', code: 'KE', tier: '진행', mrr: 8_500, arr: 102_000, projects: 2, contacts: 5, last: '오늘', health: 88 },
  { id: 3, name: '네이버 D2', code: 'ND', tier: '제안', mrr: 0, arr: 60_000, projects: 0, contacts: 3, last: '1주 전', health: 75 },
  { id: 4, name: '쿠팡', code: 'CP', tier: '진행', mrr: 15_000, arr: 180_000, projects: 4, contacts: 12, last: '어제', health: 95 },
  { id: 5, name: '토스', code: 'TS', tier: '리드', mrr: 0, arr: 0, projects: 0, contacts: 1, last: '3일 전', health: 60 },
  { id: 6, name: '당근마켓', code: 'KR', tier: '제안', mrr: 0, arr: 48_000, projects: 0, contacts: 2, last: '5일 전', health: 70 },
  { id: 7, name: '오늘의집', code: 'OH', tier: '진행', mrr: 6_000, arr: 72_000, projects: 1, contacts: 4, last: '오늘', health: 84 },
  { id: 8, name: '배달의민족', code: 'BM', tier: '진행', mrr: 9_500, arr: 114_000, projects: 2, contacts: 7, last: '4일 전', health: 81 },
];

const TIER_TONE: Record<string, 'success' | 'accent' | 'warning'> = { 진행: 'success', 제안: 'accent', 리드: 'warning' };

export function ClientsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<(typeof CLIENTS)[number] | null>(null);
  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: '활성 고객사', v: '8', d: '+2' },
          { l: 'MRR', v: '₩51M', d: '+8%' },
          { l: 'ARR', v: '₩720M', d: '+12%' },
          { l: '평균 헬스', v: '81', d: '+3' },
        ].map(m => (
          <Card key={m.l}>
            <CardBody className="!p-4">
              <div className="text-[11px] text-fg-2">{m.l}</div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-[24px] font-bold text-fg mono leading-none">{m.v}</div>
                <div className="text-[11px] mono text-success">{m.d}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-bg-2 border border-border">
          {['전체', '진행', '제안', '리드'].map((c, i) => (
            <button key={c} className={`px-2.5 h-7 rounded text-[12px] font-medium transition-colors ${i === 0 ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2'}`}>{c}</button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
          <input placeholder="고객사 검색..." className="h-8 w-56 pl-8 pr-3 rounded-md bg-bg-elev border border-border text-[12.5px] focus:outline-none focus:border-accent" />
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Plus size={13} /> 새 고객사</Button>
        <ClientForm open={createOpen} onOpenChange={setCreateOpen} />
        {selected && (
          <ClientDetail
            client={{ id: selected.id, name: selected.name, code: selected.code, tier: selected.tier }}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {CLIENTS.map(c => (
          <Card
            key={c.id}
            hoverable
            role="button"
            tabIndex={0}
            onClick={() => setSelected(c)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelected(c);
              }
            }}
            aria-label={`${c.name} 상세 보기`}>
            <CardBody className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent-strong grid place-items-center font-bold mono shrink-0">{c.code}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-fg truncate">{c.name}</div>
                  <Badge tone={TIER_TONE[c.tier]} className="mt-1">{c.tier}</Badge>
                </div>
                <ChevronRight size={14} className="text-fg-3 mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-[11px]">
                <div>
                  <div className="text-fg-3">MRR</div>
                  <div className="text-[14px] font-semibold mono text-fg">₩{(c.mrr / 1000).toFixed(0)}K</div>
                </div>
                <div>
                  <div className="text-fg-3">ARR</div>
                  <div className="text-[14px] font-semibold mono text-fg">₩{(c.arr / 1000).toFixed(0)}K</div>
                </div>
                <div>
                  <div className="text-fg-3">프로젝트</div>
                  <div className="text-[14px] font-semibold mono text-fg">{c.projects}</div>
                </div>
                <div>
                  <div className="text-fg-3">컨택트</div>
                  <div className="text-[14px] font-semibold mono text-fg">{c.contacts}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10.5px] text-fg-3 pt-1">
                <span>마지막 접점 {c.last}</span>
                <span className="ml-auto inline-flex items-center gap-0.5"><TrendingUp size={10} /> 헬스 {c.health}</span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
