'use client';

import { useMemo, useRef, useState } from 'react';
import { Card, CardBody, Avatar, Badge, Button } from '@/components/ui/primitives';
import { MoreHorizontal, Search, Shield, UserPlus, Filter, Download, X, Mail, Copy } from 'lucide-react';
import { useUsers, useInviteUser, useUserMetrics, useMe } from '@/lib/hooks/use-data';
import { toast } from 'sonner';
import type { User } from '@/lib/schemas';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';

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
  const { data: me } = useMe();
  const inviteMutation = useInviteUser();
  const { data: userMetrics } = useUserMetrics();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const displayed = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
  }, [users, search]);

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
      <AiGuideWidget
        systemContext={`사용자 관리 — 전체 ${users.length}명, MFA 활성 ${users.filter(u => u.mfaEnabled).length}명, 초대 대기 ${userMetrics?.pendingInvites ?? 0}건`}
        hints={[
          (userMetrics?.pendingInvites ?? 0) > 0 ? `초대 대기 ${userMetrics!.pendingInvites}건 — 재발송 또는 취소 방법` : '비활성 사용자 찾아줘',
          users.filter(u => !u.mfaEnabled).length > 0 ? `MFA 미설정 ${users.filter(u => !u.mfaEnabled).length}명 보안 강화 방법` : '권한 설정 가이드해줘',
          '팀원 온보딩 체크리스트 알려줘',
        ]}
      />
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: '전체 사용자', v: userMetrics ? String(userMetrics.total) : String(users.length), sub: undefined },
          { l: '활성', v: String(users.length), sub: undefined },
          { l: 'MFA 활성', v: String(users.filter(u => u.mfaEnabled).length), sub: `/ ${users.length}명` },
          { l: '대기 초대', v: userMetrics ? String(userMetrics.pendingInvites) : '—', sub: undefined },
        ].map(m => (
          <Card key={m.l}>
            <CardBody className="!p-4">
              <div className="text-[11px] text-fg-2">{m.l}</div>
              <div className="text-[24px] font-bold mono text-fg mt-1">{m.v}</div>
              {m.sub && <div className="text-[10.5px] text-fg-3 mt-0.5">{m.sub}</div>}
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant={showSearch ? 'primary' : 'secondary'} size="sm" onClick={() => { setShowSearch(v => !v); setSearch(''); }}>
          <Filter size={13} /> 필터
        </Button>
        {showSearch && (
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="이름·이메일·역할 검색..."
              className="h-8 w-52 pl-8 pr-7 rounded-md bg-bg-elev border border-border text-[12.5px] focus:outline-none focus:border-accent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg">
                <X size={11} />
              </button>
            )}
          </div>
        )}
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
          <input type="checkbox" className="justify-self-center" checked={displayed.length > 0 && selectedIds.size === displayed.length} onChange={e => setSelectedIds(e.target.checked ? new Set(displayed.map(u => u.id)) : new Set())} />
          <div>사용자</div><div>역할</div><div>MFA</div><div>상태</div><div>마지막 활동</div><div />
        </div>
        {isLoading && (
          <div className="px-4 py-12 text-center text-[12px] text-fg-3">불러오는 중...</div>
        )}
        {error && (
          <div className="px-4 py-12 text-center text-[12px] text-danger">사용자를 불러오지 못했습니다.</div>
        )}
        {!isLoading && !error && displayed.length === 0 && (
          <div className="px-4 py-12 text-center text-[12px] text-fg-3">{search ? '검색 결과가 없습니다.' : '사용자가 없습니다.'}</div>
        )}
        {displayed.map(u => (
          <div
            key={u.id}
            className="grid grid-cols-[36px_1fr_140px_100px_80px_100px_28px] gap-3 px-4 py-2.5 items-center text-[12.5px] border-b border-border last:border-0 hover:bg-hover"
          >
            <input type="checkbox" className="justify-self-center" checked={selectedIds.has(u.id)} onChange={e => setSelectedIds(prev => { const next = new Set(prev); e.target.checked ? next.add(u.id) : next.delete(u.id); return next; })} />
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar user={u} size={28} />
              <div className="min-w-0">
                <div className="text-fg font-medium truncate">{u.name}</div>
                <div className="text-[11px] text-fg-3 truncate">{u.email ?? '—'}</div>
              </div>
            </div>
            <div>
              <Badge tone="neutral">{u.role}</Badge>
              {u.id === me?.id && (
                <span className="ml-1">
                  <Shield size={11} className="inline text-accent" />
                </span>
              )}
            </div>
            <div><Badge tone={u.mfaEnabled ? 'success' : 'neutral'}>{u.mfaEnabled ? 'ON' : '—'}</Badge></div>
            <div>
              <span className="inline-flex items-center gap-1 text-[11.5px]">
                <span className="w-1.5 h-1.5 rounded-full bg-success" /> 활성
              </span>
            </div>
            <div className="text-[11.5px] mono text-fg-2">—</div>
            <UserMenu user={u} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function UserMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="text-fg-3 hover:text-fg-1"
        onClick={() => setOpen(v => !v)}
        aria-label={`${user.name} 메뉴`}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-6 z-50 w-44 rounded-lg border border-border bg-bg-elev shadow-pop py-1"
          onMouseLeave={() => setOpen(false)}
        >
          {user.email && (
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-fg-1 hover:bg-hover"
              onClick={() => { navigator.clipboard.writeText(user.email!); toast.success('이메일을 복사했습니다'); setOpen(false); }}
            >
              <Mail size={13} /> 이메일 복사
            </button>
          )}
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-fg-1 hover:bg-hover"
            onClick={() => { navigator.clipboard.writeText(user.id); toast.success('사용자 ID를 복사했습니다'); setOpen(false); }}
          >
            <Copy size={13} /> ID 복사
          </button>
        </div>
      )}
    </div>
  );
}
