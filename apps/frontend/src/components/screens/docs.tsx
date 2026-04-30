'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Avatar, Badge, Button, IconButton } from '@/components/ui/primitives';
import { TEAM, userById } from '@/lib/fixtures';
import { FileText, Plus, Search, Sparkles, Star, ChevronRight, Hash, Clock, Edit3 } from 'lucide-react';
import { DocCreateDialog } from '@/components/dialogs/doc-create-dialog';

const TREE = [
  { id: 'eng', label: '🛠 Engineering', kids: [
    { id: 'eng-onboard', label: '온보딩 가이드', updated: '어제', author: 'u2' },
    { id: 'eng-deploy', label: '배포 프로세스', updated: '3일 전', author: 'u3' },
    { id: 'eng-arch', label: '시스템 아키텍처', updated: '1주 전', author: 'u6' },
  ]},
  { id: 'design', label: '🎨 Design', kids: [
    { id: 'design-system', label: '디자인 시스템 v2', updated: '오늘', author: 'u1' },
    { id: 'design-token', label: '컬러 토큰 정의', updated: '2일 전', author: 'u1' },
  ]},
  { id: 'product', label: '📦 Product', kids: [
    { id: 'product-prd', label: 'Q2 PRD — 모바일 v3.0', updated: '오늘', author: 'me' },
    { id: 'product-okr', label: '2026 OKR', updated: '4/15', author: 'u6' },
  ]},
];

export function DocsPage() {
  const [active, setActive] = useState('product-prd');
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="grid grid-cols-[280px_1fr_280px] h-[calc(100vh-56px)] border-t border-border">
      {/* Tree */}
      <div className="bg-bg-1 border-r border-border overflow-y-auto scroll">
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
            <input placeholder="문서 검색..." className="w-full h-8 pl-8 pr-3 rounded-md bg-bg-2 border border-border text-[12px] focus:outline-none focus:border-accent" />
          </div>
          <Button variant="primary" size="sm" className="w-full" onClick={() => setCreateOpen(true)}><Plus size={12} /> 새 문서</Button>
          <DocCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
        </div>
        <div className="p-2">
          {TREE.map(g => (
            <div key={g.id} className="mb-1">
              <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-fg-3 font-semibold">{g.label}</div>
              {g.kids.map(k => {
                const u = userById(k.author);
                return (
                  <button key={k.id} onClick={() => setActive(k.id)}
                    className={`w-full flex items-center gap-2 px-2 h-8 rounded text-[12.5px] transition-colors ${active === k.id ? 'bg-accent-soft text-accent-strong font-semibold' : 'text-fg-1 hover:bg-hover'}`}>
                    <FileText size={12} className="shrink-0" />
                    <span className="flex-1 text-left truncate">{k.label}</span>
                    {u && <Avatar user={u} size={14} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="overflow-y-auto scroll">
        <div className="max-w-[760px] mx-auto px-10 py-8">
          <div className="text-[11px] text-fg-3 flex items-center gap-1.5">
            Product <ChevronRight size={11} /> Q2 PRD <span className="ml-2"><Clock size={10} className="inline" /> 5분 전 저장됨</span>
          </div>
          <div className="flex items-start gap-2 mt-4">
            <h1 className="text-[32px] font-bold tracking-tight text-fg flex-1">Q2 PRD — 모바일 앱 v3.0 리뉴얼</h1>
            <IconButton size="sm"><Star size={14} /></IconButton>
            <Button variant="secondary" size="sm"><Sparkles size={12} /> AI 요약</Button>
          </div>
          <div className="flex items-center gap-2 mt-3 text-[12px] text-fg-2">
            <Avatar user={userById('me')!} size={20} />
            <span>김지우</span>
            <span>·</span>
            <span>읽기 8분</span>
            <span>·</span>
            <span>↩ 12회 편집</span>
          </div>

          <div className="rounded-lg bg-accent-soft border border-accent/20 p-4 mt-6">
            <div className="flex items-center gap-2 mb-2"><Sparkles size={13} className="text-accent-strong" /><span className="text-[12px] font-semibold text-accent-strong">AI 자동 요약</span></div>
            <p className="text-[13px] text-fg-1 leading-relaxed">
              모바일 앱 v3.0 은 온보딩 개선·다크모드·푸시 알림 카테고리 액션을 핵심 목표로 합니다.
              5/22 마감, 진행률 68%. iOS 푸시 인증서 갱신이 핵심 차단 요소입니다.
            </p>
          </div>

          <div className="prose mt-8 text-[14px] text-fg-1 leading-[1.75] space-y-4">
            <h2 className="text-[20px] font-bold text-fg mt-6">1. 배경</h2>
            <p>현재 v2.4 까지 출시된 모바일 앱은 첫 사용자의 7일 이탈률이 42% 로, 업계 평균(28%)을 크게 웃돕니다. 분석 결과 온보딩 플로우의 5단계 중 3단계에서 가장 큰 이탈이 발생...</p>

            <h2 className="text-[20px] font-bold text-fg mt-6">2. 목표</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>온보딩 7일 이탈률 <strong>42% → 25%</strong></li>
              <li>다크모드 지원 (시스템 동기화 + 수동 토글)</li>
              <li>iOS 17 푸시 알림 카테고리 액션 도입</li>
            </ul>

            <h2 className="text-[20px] font-bold text-fg mt-6">3. 일정</h2>
            <p>5/2 디자인 QA → 5/4 푸시 인증서 갱신 → 5/22 정식 출시</p>

            <h2 className="text-[20px] font-bold text-fg mt-6">4. 관련 문서</h2>
            <div className="flex flex-wrap gap-1.5">
              {['디자인 시스템 v2', '온보딩 가이드', '시스템 아키텍처'].map(t => (
                <span key={t} className="text-[12px] px-2 py-1 rounded bg-bg-2 text-accent-strong border border-border"><Hash size={10} className="inline" /> {t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right — outline + comments */}
      <div className="bg-bg-1 border-l border-border overflow-y-auto scroll p-4 space-y-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-2">목차</div>
          <div className="space-y-1 text-[12px]">
            {['1. 배경', '2. 목표', '3. 일정', '4. 관련 문서'].map(t => (
              <a key={t} className="block px-2 py-1 rounded hover:bg-hover text-fg-1 cursor-pointer">{t}</a>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-2">댓글 (3)</div>
          <div className="space-y-2 text-[11.5px]">
            {[{ u: 'u6', t: '목표 이탈률 25% 의 근거 확인 필요' }, { u: 'u1', t: '다크모드 토글 위치 합의됐나요?' }].map((c, i) => {
              const u = userById(c.u);
              return (
                <div key={i} className="rounded-md border border-border bg-bg-elev p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">{u && <Avatar user={u} size={16} />}<span className="font-semibold text-fg">{u?.name}</span></div>
                  <div className="text-fg-1 leading-relaxed">{c.t}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
