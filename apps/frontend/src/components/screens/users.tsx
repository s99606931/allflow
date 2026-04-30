'use client';

import { useState } from 'react';
import { Card, CardBody, Avatar, Badge, Button } from '@/components/ui/primitives';
import { MoreHorizontal, Shield, UserPlus, Filter, Download } from 'lucide-react';
import { useUsers, useInviteUser } from '@/lib/hooks/use-data';
import type { User } from '@/lib/schemas';

function downloadCSV(users: User[]) {
  const header = 'ID,이름,이메일,역할,부서';
  const rows = users.map(u => `${u.id},${u.name},${u.email ?? ''},${u.role},${u.dept}`);
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'users.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function UsersPage() {
  const { data: users = [], isLoading, error } = useUsers();
  const inviteMutation = useInviteUser();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate(inviteEmail.trim(), {
      onSuccess: () => {
        setInviteEmail('');
        setShowInvite(false);
      },
    });
  }

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: '전체 사용자', v: String(users.length) },
          { l: '활성', v: String(users.length) },
          { l: 'MFA 활성', v: '—' },
          { l: '대기 초대', v: '—' },
        ].map(m => (
          <Card key={m.l}>
            <CardBody className="!p-4">
              <div className="text-[11px] text-fg-2">{m.l}</div>
              <div className="text-[24px] font-bold mono text-fg mt-1">{m.v}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm"><Filter size={13} /> 필터</Button>
        <div className="flex-1" />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => downloadCSV(users)}
        >
          <Download size={13} /> CSV
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowInvite(v => !v)}
        >
          <UserPlus size={13} /> 사용자 초대
        </Button>
      </div>

      {showInvite && (
        <Card>
          <CardBody className="!p-4">
            <div className="text-[13px] font-semibold text-fg mb-3">사용자 초대</div>
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="이메일 주소 입력"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                className="flex-1 h-8 rounded-md border border-border bg-bg px-3 text-[13px] text-fg placeholder:text-fg-3 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleInvite}
                disabled={inviteMutation.isPending || !inviteEmail.trim()}
              >
                {inviteMutation.isPending ? '전송 중...' : '초대 전송'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setShowInvite(false); setInviteEmail(''); }}
              >
                취소
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <div className="grid grid-cols-[36px_1fr_140px_100px_80px_100px_28px] gap-3 px-4 h-9 items-center text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold border-b border-border">
          <input type="checkbox" className="justify-self-center" />
          <div>사용자</div><div>역할</div><div>MFA</div><div>상태</div><div>마지막 활동</div><div />
        </div>
        {isLoading && (
          <div className="px-4 py-12 text-center text-[12px] text-fg-3">불러오는 중...</div>
        )}
        {error && (
          <div className="px-4 py-12 text-center text-[12px] text-danger">사용자를 불러오지 못했습니다.</div>
        )}
        {!isLoading && !error && users.length === 0 && (
          <div className="px-4 py-12 text-center text-[12px] text-fg-3">사용자가 없습니다.</div>
        )}
        {users.map(u => (
          <div
            key={u.id}
            className="grid grid-cols-[36px_1fr_140px_100px_80px_100px_28px] gap-3 px-4 py-2.5 items-center text-[12.5px] border-b border-border last:border-0 hover:bg-hover"
          >
            <input type="checkbox" className="justify-self-center" />
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar user={u} size={28} />
              <div className="min-w-0">
                <div className="text-fg font-medium truncate">{u.name}</div>
                <div className="text-[11px] text-fg-3 truncate">{u.email ?? '—'}</div>
              </div>
            </div>
            <div>
              <Badge tone="neutral">{u.role}</Badge>
              {u.id === 'me' && (
                <span className="ml-1">
                  <Shield size={11} className="inline text-accent" />
                </span>
              )}
            </div>
            <div><Badge tone="neutral">—</Badge></div>
            <div>
              <span className="inline-flex items-center gap-1 text-[11.5px]">
                <span className="w-1.5 h-1.5 rounded-full bg-success" /> 활성
              </span>
            </div>
            <div className="text-[11.5px] mono text-fg-2">—</div>
            <button className="text-fg-3 hover:text-fg-1"><MoreHorizontal size={14} /></button>
          </div>
        ))}
      </Card>
    </div>
  );
}
