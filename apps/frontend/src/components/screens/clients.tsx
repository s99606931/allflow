'use client';

import { useState } from 'react';
import { Card, CardBody, Button } from '@/components/ui/primitives';
import { ChevronRight, Pencil, Plus, Search, Trash2, TrendingUp } from 'lucide-react';
import { ClientForm } from '@/components/dialogs/client-form';
import { ClientDetail } from '@/components/dialogs/client-detail';
import { useClients, useClientMutations } from '@/lib/hooks/use-data';
import type { Client } from '@/lib/schemas';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';

/** Derive a 2-letter code from the client name for the avatar badge. */
function codeOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '·';
  const letters = trimmed.replace(/[^A-Za-z가-힣]/g, '');
  return (letters.slice(0, 2) || trimmed.slice(0, 2)).toUpperCase();
}

/** Format ISO date to a relative-ish display string. */
function lastContactOf(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = Math.floor(diff / (24 * 3600 * 1000));
  if (day < 1) return '오늘';
  if (day < 2) return '어제';
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.floor(day / 7)}주 전`;
  return `${Math.floor(day / 30)}개월 전`;
}

export function ClientsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const { data: clients = [], isLoading, error } = useClients();
  const { remove } = useClientMutations();

  const thisMonth = new Date();
  const newThisMonth = clients.filter(c => {
    const d = new Date(c.createdAt);
    return d.getFullYear() === thisMonth.getFullYear() && d.getMonth() === thisMonth.getMonth();
  }).length;
  const industrySet = new Set(clients.map(c => c.industry).filter(Boolean));

  const STATUS_FILTERS = ['전체', '진행', '제안', '리드'] as const;
  const filtered = clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.contact?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== '전체' && c.industry !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <AiGuideWidget
        systemContext={`고객사 관리 — 전체 ${clients.length}개, 이번달 신규 ${newThisMonth}개, 업종 ${industrySet.size}개`}
        hints={[
          newThisMonth > 0 ? `이번달 신규 ${newThisMonth}개 온보딩 체크리스트` : '팔로업 필요한 고객사 찾아줘',
          (() => { const noContact = clients.filter(c => !c.email && !c.phone).length; return noContact > 0 ? `연락처 미등록 ${noContact}개 고객사 정보 보완 방법` : '고객사 업종별 분류 현황 알려줘'; })(),
          `전체 ${clients.length}개 고객사 현황 요약해줘`,
        ]}
      />
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: '활성 고객사', v: String(clients.length), d: '+0' },
          { l: '이번 달 신규', v: String(newThisMonth), d: '' },
          { l: '산업 분류', v: String(industrySet.size), d: '종류' },
          { l: '연락처 등록', v: String(clients.filter(c => c.email || c.phone).length), d: `/ ${clients.length}` },
        ].map(m => (
          <Card key={m.l}>
            <CardBody className="!p-4">
              <div className="text-[11px] text-fg-2">{m.l}</div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-[24px] font-bold text-fg mono leading-none">{m.v}</div>
                <div className="text-[11px] mono text-fg-3">{m.d}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-bg-2 border border-border">
          {STATUS_FILTERS.map((c) => (
            <button key={c} onClick={() => setStatusFilter(c)} className={`px-2.5 h-7 rounded text-[12px] font-medium transition-colors ${statusFilter === c ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2 hover:text-fg-1'}`}>{c}</button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="고객사 검색..." className="h-8 w-56 pl-8 pr-3 rounded-md bg-bg-elev border border-border text-[12.5px] focus:outline-none focus:border-accent" />
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Plus size={13} /> 새 고객사</Button>
        <ClientForm open={createOpen} onOpenChange={setCreateOpen} />
        {editTarget && (
          <ClientForm open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)} client={editTarget} />
        )}
        {selected && (
          <ClientDetail
            client={{ id: selected.id, name: selected.name, code: codeOf(selected.name), tier: selected.industry ?? '' }}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      {isLoading && <div className="py-12 text-center text-[12px] text-fg-3">불러오는 중...</div>}
      {error && (
        <div className="py-12 text-center text-[12px] text-danger">고객사를 불러오지 못했습니다.</div>
      )}
      {!isLoading && !error && clients.length === 0 && (
        <div className="py-12 text-center text-[12px] text-fg-3">등록된 고객사가 없습니다. 우상단 &lsquo;새 고객사&rsquo;를 눌러 추가하세요.</div>
      )}
      {!isLoading && !error && clients.length > 0 && filtered.length === 0 && (
        <div className="py-12 text-center text-[12px] text-fg-3">검색 결과가 없습니다.</div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {filtered.map(c => (
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
              aria-label={`${c.name} 상세 보기`}
              className="group">
              <CardBody className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent-strong grid place-items-center font-bold mono shrink-0">{codeOf(c.name)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-fg truncate">{c.name}</div>
                    {c.industry && <div className="text-[11px] text-fg-3 truncate mt-0.5">{c.industry}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setEditTarget(c); }}
                    className="opacity-0 group-hover:opacity-100 text-fg-3 hover:text-accent shrink-0 transition-opacity mt-0.5"
                    aria-label="고객사 수정"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); if (confirm(`"${c.name}" 고객사를 삭제하시겠습니까?`)) remove.mutate(c.id); }}
                    className="opacity-0 group-hover:opacity-100 text-fg-3 hover:text-danger shrink-0 transition-opacity mt-0.5"
                    aria-label="고객사 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                  <ChevronRight size={14} className="text-fg-3 mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-[11px]">
                  <div>
                    <div className="text-fg-3">담당자</div>
                    <div className="text-[12px] font-semibold text-fg truncate">{c.contact ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-fg-3">이메일</div>
                    <div className="text-[12px] font-semibold text-fg truncate">{c.email ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-fg-3">전화</div>
                    <div className="text-[12px] font-semibold text-fg truncate">{c.phone ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-fg-3">등록</div>
                    <div className="text-[12px] font-semibold text-fg truncate">{lastContactOf(c.createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10.5px] text-fg-3 pt-1">
                  <span>등록 {lastContactOf(c.createdAt)}</span>
                  <span className="ml-auto inline-flex items-center gap-0.5"><TrendingUp size={10} /> 활성</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
