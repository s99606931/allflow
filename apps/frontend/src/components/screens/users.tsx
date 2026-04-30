'use client';

import { Card, CardBody, CardHeader, CardTitle, Avatar, Badge, Button } from '@/components/ui/primitives';
import { TEAM, userById } from '@/lib/fixtures';
import { Mail, MoreHorizontal, Plus, Search, Shield, UserPlus, Filter, Download } from 'lucide-react';

const USERS = [
  { id: 'me', role: 'Owner', mfa: true, status: 'active', last: '방금' },
  { id: 'u6', role: 'Admin', mfa: true, status: 'active', last: '5분 전' },
  { id: 'u2', role: 'Member', mfa: true, status: 'active', last: '1시간 전' },
  { id: 'u1', role: 'Member', mfa: true, status: 'active', last: '2시간 전' },
  { id: 'u3', role: 'Member', mfa: false, status: 'active', last: '오늘' },
  { id: 'u4', role: 'Member', mfa: true, status: 'active', last: '어제' },
  { id: 'u5', role: 'Member', mfa: false, status: 'pending', last: '-' },
];

export function UsersPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: '전체 사용자', v: '10' },
          { l: '활성', v: '9' },
          { l: 'MFA 활성', v: '78%' },
          { l: '대기 초대', v: '1' },
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
        {USERS.map(row => {
          const u = userById(row.id);
          if (!u) return null;
          return (
            <div key={row.id} className="grid grid-cols-[36px_1fr_140px_100px_80px_100px_28px] gap-3 px-4 py-2.5 items-center text-[12.5px] border-b border-border last:border-0 hover:bg-hover">
              <input type="checkbox" className="justify-self-center" />
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar user={u} size={28} />
                <div className="min-w-0">
                  <div className="text-fg font-medium truncate">{u.name}</div>
                  <div className="text-[11px] text-fg-3 truncate">{u.email ?? `${u.id}@omelet.com`}</div>
                </div>
              </div>
              <div>
                {row.role === 'Owner' && <Badge tone="accent"><Shield size={9} /> Owner</Badge>}
                {row.role === 'Admin' && <Badge tone="warning"><Shield size={9} /> Admin</Badge>}
                {row.role === 'Member' && <Badge tone="neutral">Member</Badge>}
              </div>
              <div>{row.mfa ? <Badge tone="success">활성</Badge> : <Badge tone="danger">미활성</Badge>}</div>
              <div>{row.status === 'active' ? <span className="inline-flex items-center gap-1 text-[11.5px]"><span className="w-1.5 h-1.5 rounded-full bg-success" /> 활성</span> : <Badge tone="warning">대기</Badge>}</div>
              <div className="text-[11.5px] mono text-fg-2">{row.last}</div>
              <button className="text-fg-3 hover:text-fg-1"><MoreHorizontal size={14} /></button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
