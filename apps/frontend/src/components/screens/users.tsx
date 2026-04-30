'use client';

import { Card, CardBody, Avatar, Badge, Button } from '@/components/ui/primitives';
import { userById } from '@/lib/fixtures';
import { MoreHorizontal, Shield, UserPlus, Filter, Download } from 'lucide-react';
import { useUsers } from '@/lib/hooks/use-data';

export function UsersPage() {
  const { data: userIds, isLoading, error } = useUsers();
  const users = userIds.map(id => ({ id, profile: userById(id) }));
  const activeCount = users.length;

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: '전체 사용자', v: String(activeCount) },
          { l: '활성', v: String(activeCount) },
          { l: 'MFA 활성', v: '—' },
          { l: '대기 초대', v: '—' },
        ].map(m => (
          <Card key={m.l}><CardBody className="!p-4"><div className="text-[11px] text-fg-2">{m.l}</div><div className="text-[24px] font-bold mono text-fg mt-1">{m.v}</div></CardBody></Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm"><Filter size={13} /> 필터</Button>
        <div className="flex-1" />
        <Button variant="secondary" size="sm"><Download size={13} /> CSV</Button>
        <Button variant="primary" size="sm"><UserPlus size={13} /> 사용자 초대</Button>
      </div>

      <Card>
        <div className="grid grid-cols-[36px_1fr_140px_100px_80px_100px_28px] gap-3 px-4 h-9 items-center text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold border-b border-border">
          <input type="checkbox" className="justify-self-center" />
          <div>사용자</div><div>역할</div><div>MFA</div><div>상태</div><div>마지막 활동</div><div />
        </div>
        {isLoading && <div className="px-4 py-12 text-center text-[12px] text-fg-3">불러오는 중...</div>}
        {error && <div className="px-4 py-12 text-center text-[12px] text-danger">사용자를 불러오지 못했습니다.</div>}
        {!isLoading && !error && users.length === 0 && (
          <div className="px-4 py-12 text-center text-[12px] text-fg-3">사용자가 없습니다.</div>
        )}
        {users.map(({ id, profile }) => (
          <div key={id} className="grid grid-cols-[36px_1fr_140px_100px_80px_100px_28px] gap-3 px-4 py-2.5 items-center text-[12.5px] border-b border-border last:border-0 hover:bg-hover">
            <input type="checkbox" className="justify-self-center" />
            <div className="flex items-center gap-2.5 min-w-0">
              {profile ? <Avatar user={profile} size={28} /> : <span className="w-7 h-7 rounded-full bg-bg-2" />}
              <div className="min-w-0">
                <div className="text-fg font-medium truncate">{profile?.name ?? id}</div>
                <div className="text-[11px] text-fg-3 truncate">{profile?.email ?? '—'}</div>
              </div>
            </div>
            <div>
              <Badge tone="neutral">{profile?.role ?? 'Member'}</Badge>
              {id === 'me' && <span className="ml-1"><Shield size={11} className="inline text-accent" /></span>}
            </div>
            <div><Badge tone="neutral">—</Badge></div>
            <div><span className="inline-flex items-center gap-1 text-[11.5px]"><span className="w-1.5 h-1.5 rounded-full bg-success" /> 활성</span></div>
            <div className="text-[11.5px] mono text-fg-2">—</div>
            <button className="text-fg-3 hover:text-fg-1"><MoreHorizontal size={14} /></button>
          </div>
        ))}
      </Card>
    </div>
  );
}
