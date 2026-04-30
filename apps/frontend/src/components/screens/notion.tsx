'use client';

import { Card, CardBody, CardHeader, CardTitle, Avatar, Badge, Button, Progress } from '@/components/ui/primitives';
import { Database, RefreshCw, Settings2, Plus, ExternalLink, AlertCircle } from 'lucide-react';

const DBS = [
  { name: '제품 로드맵', items: 142, lastSync: '2분 전', status: 'ok', direction: '양방향' },
  { name: '회의록', items: 86, lastSync: '12분 전', status: 'ok', direction: 'Notion → ALL-Flow' },
  { name: 'Q2 OKR', items: 24, lastSync: '1시간 전', status: 'ok', direction: '양방향' },
  { name: '온보딩 가이드', items: 18, lastSync: '어제', status: 'warn', direction: 'Notion → ALL-Flow' },
  { name: '디자인 토큰', items: 56, lastSync: '3분 전', status: 'ok', direction: 'ALL-Flow → Notion' },
  { name: '경쟁사 분석', items: 32, lastSync: '5일 전', status: 'error', direction: '양방향' },
];

export function NotionPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1280px] mx-auto">
      <Card className="!bg-accent-soft border-accent/20">
        <CardBody className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-bg-elev grid place-items-center shrink-0 text-[18px]">📓</div>
          <div className="flex-1">
            <div className="text-[14px] font-bold text-fg">Notion 워크스페이스 연결됨</div>
            <p className="text-[12.5px] text-fg-1 mt-0.5">Omelet HQ · 6개 데이터베이스 동기화 중 · 마지막 풀 동기화 2분 전</p>
          </div>
          <Button variant="secondary" size="sm"><RefreshCw size={12} /> 전체 동기화</Button>
          <Button variant="secondary" size="sm"><Settings2 size={12} /> 설정</Button>
        </CardBody>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        {[
          { l: '연결된 DB', v: '6' },
          { l: '동기화된 항목', v: '358' },
          { l: '동기화 실패', v: '1', tone: 'danger' },
        ].map(m => (
          <Card key={m.l}><CardBody className="!p-4"><div className="text-[11px] text-fg-2">{m.l}</div><div className={`text-[24px] font-bold mono mt-1 ${m.tone === 'danger' ? 'text-danger' : 'text-fg'}`}>{m.v}</div></CardBody></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>연결된 데이터베이스</CardTitle>
          <Button variant="primary" size="sm"><Plus size={13} /> DB 추가</Button>
        </CardHeader>
        <CardBody className="!p-0">
          {DBS.map(db => (
            <div key={db.name} className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-0 hover:bg-hover transition-colors">
              <Database size={16} className="text-fg-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-fg truncate">{db.name}</span>
                  {db.status === 'ok' && <Badge tone="success">정상</Badge>}
                  {db.status === 'warn' && <Badge tone="warning">지연</Badge>}
                  {db.status === 'error' && <Badge tone="danger"><AlertCircle size={9} /> 실패</Badge>}
                </div>
                <div className="text-[11px] text-fg-3 mt-0.5">{db.items}개 항목 · {db.direction} · 마지막 {db.lastSync}</div>
              </div>
              <Button variant="ghost" size="sm"><RefreshCw size={12} /></Button>
              <Button variant="ghost" size="sm"><ExternalLink size={12} /></Button>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>동기화 정책</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          {[
            { l: '자동 동기화', v: '5분마다', enabled: true },
            { l: '충돌 해결', v: 'ALL-Flow 우선', enabled: true },
            { l: '댓글 동기화', v: '활성', enabled: true },
            { l: '아카이브된 항목 동기화', v: '비활성', enabled: false },
          ].map(p => (
            <div key={p.l} className="flex items-center justify-between text-[12.5px]">
              <div>
                <div className="font-medium text-fg">{p.l}</div>
                <div className="text-[11px] text-fg-2 mt-0.5">{p.v}</div>
              </div>
              <button className={`relative w-9 h-5 rounded-full transition-colors ${p.enabled ? 'bg-accent' : 'bg-bg-2 border border-border'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${p.enabled ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
