'use client';

import { Card, CardBody, Avatar, Badge, Button, IconButton } from '@/components/ui/primitives';
import { userById } from '@/lib/fixtures';
import { AlertCircle, AtSign, Bell, CheckCircle2, GitMerge, MessageSquare, Sparkles, Filter, Settings2 } from 'lucide-react';

const NOTIFS = [
  { id: 1, type: 'mention', who: 'u2', text: '@김지우 5번째 화면 motion easing 살짝 더 부드럽게 가능할까요?', target: '#engineering', time: '5분 전', read: false, sev: 'high' },
  { id: 2, type: 'sla', text: 'ISS-238 SLA 92% 도달 (P0)', target: '결제 시스템', time: '15분 전', read: false, sev: 'high' },
  { id: 3, type: 'ai', text: 'AI가 회의록에서 4개 액션 아이템을 추출했습니다', target: '주간 동기화', time: '1시간 전', read: false, sev: 'med' },
  { id: 4, type: 'review', who: 'u3', text: '@김지우 PR #428 리뷰 요청', target: 'pay/refactor', time: '2시간 전', read: false, sev: 'med' },
  { id: 5, type: 'status', who: 'u1', text: '디자인 시안 v2가 완료되었습니다', target: 'T-1024', time: '3시간 전', read: true, sev: 'low' },
  { id: 6, type: 'mention', who: 'u5', text: '@김지우 Q2 캠페인 KPI 정리 부탁드려요', target: '#marketing', time: '5시간 전', read: true, sev: 'med' },
  { id: 7, type: 'sla', text: 'ISS-225 SLA 60% 도달 (P2)', target: '캘린더 시간대', time: '어제', read: true, sev: 'low' },
  { id: 8, type: 'system', text: '새 사용자 정태훈이 워크스페이스에 합류했습니다', target: '워크스페이스', time: '어제', read: true, sev: 'low' },
];

const TYPE_ICON = { mention: AtSign, sla: AlertCircle, ai: Sparkles, review: GitMerge, status: CheckCircle2, system: Bell };

export function NotificationsPage() {
  return (
    <div className="p-6 max-w-[920px] mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-[18px] font-bold text-fg">알림 센터</h2>
        <Badge tone="danger">{NOTIFS.filter(n => !n.read).length}건 미확인</Badge>
        <div className="flex-1" />
        <Button variant="secondary" size="sm"><Filter size={13} /> 필터</Button>
        <Button variant="secondary" size="sm">모두 읽음</Button>
        <IconButton size="sm"><Settings2 size={14} /></IconButton>
      </div>

      <div className="flex items-center gap-1 p-0.5 rounded-md bg-bg-2 border border-border w-fit">
        {['전체', '@멘션', 'SLA', 'AI 제안', '리뷰'].map((c, i) => (
          <button key={c} className={`px-2.5 h-7 rounded text-[12px] font-medium transition-colors ${i === 0 ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2'}`}>{c}</button>
        ))}
      </div>

      <Card>
        {NOTIFS.map(n => {
          const Icon = TYPE_ICON[n.type as keyof typeof TYPE_ICON];
          const u = n.who ? userById(n.who) : null;
          return (
            <div key={n.id} className={`flex items-start gap-3 px-5 py-3.5 border-b border-border last:border-0 hover:bg-hover transition-colors cursor-pointer ${!n.read && 'bg-accent-soft/30'}`}>
              <div className={`w-8 h-8 rounded-md grid place-items-center shrink-0 ${
                n.sev === 'high' ? 'bg-danger-soft text-danger' : n.sev === 'med' ? 'bg-warning-soft text-warning' : 'bg-bg-2 text-fg-2'
              }`}>
                <Icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  {u && <span className="text-[12.5px] font-semibold text-fg">{u.name}</span>}
                  <span className="text-[10.5px] text-fg-3 ml-auto">{n.time}</span>
                </div>
                <div className="text-[13px] text-fg-1 mt-0.5 leading-relaxed">{n.text}</div>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-fg-3">
                  <span className="px-1.5 py-0.5 rounded bg-bg-2 mono">{n.target}</span>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
