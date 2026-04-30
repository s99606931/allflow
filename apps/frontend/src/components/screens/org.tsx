'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Avatar, Badge, Button } from '@/components/ui/primitives';
import { userById } from '@/lib/fixtures';
import { useOrgMutations, useOrgUnits } from '@/lib/hooks/use-data';
import { Plus, Search, UserPlus } from 'lucide-react';

export function OrgPage() {
  const { data: units = [], isLoading, error } = useOrgUnits();
  const { invite } = useOrgMutations();
  const [email, setEmail] = useState('');
  const [activeUnitId, setActiveUnitId] = useState<string>('');

  const rootUnits = units.filter(u => u.parentId === null);
  const childUnits = units.filter(u => u.parentId !== null);
  const targetUnitId = activeUnitId || childUnits[0]?.id || rootUnits[0]?.id || '';

  const onInvite = () => {
    if (!email || !targetUnitId) return;
    invite.mutate({ email, orgUnitId: targetUnitId, role: 'member' });
    setEmail('');
  };

  return (
    <div className="p-6 space-y-5 max-w-[1280px] mx-auto">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
          <input placeholder="사람/팀 검색..." className="w-full h-8 pl-8 pr-3 rounded-md bg-bg-elev border border-border text-[12.5px] focus:outline-none focus:border-accent" />
        </div>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="h-8 w-56 px-2 rounded-md bg-bg-elev border border-border text-[12.5px] focus:outline-none focus:border-accent"
        />
        <Button
          variant="primary"
          size="sm"
          disabled={invite.isPending || !email || !targetUnitId}
          onClick={onInvite}
        >
          <UserPlus size={13} /> {invite.isPending ? '전송 중...' : '초대'}
        </Button>
        <Button variant="secondary" size="sm"><Plus size={13} /> 부서 추가</Button>
      </div>

      {isLoading && <div className="py-12 text-center text-[12px] text-fg-3">불러오는 중...</div>}
      {error && <div className="py-12 text-center text-[12px] text-danger">조직 정보를 불러오지 못했습니다.</div>}
      {!isLoading && !error && units.length === 0 && (
        <div className="py-12 text-center text-[12px] text-fg-3">등록된 조직 단위가 없습니다.</div>
      )}

      {rootUnits.length > 0 && (
        <div className="flex flex-col items-center">
          {rootUnits.slice(0, 1).map(root => (
            <Card key={root.id} className="w-64 text-center">
              <CardBody className="!p-4">
                <div className="text-[14px] font-bold text-fg mt-2">{root.name}</div>
                <div className="text-[11.5px] text-fg-2">{root.members.length}명</div>
                <Badge tone="accent" className="mt-1.5">ROOT</Badge>
              </CardBody>
            </Card>
          ))}
          <div className="w-px h-8 bg-border" />
          <div className="h-px w-full bg-border max-w-3xl" />
        </div>
      )}

      {childUnits.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {childUnits.map(d => (
            <Card
              key={d.id}
              hoverable
              role="button"
              tabIndex={0}
              onClick={() => setActiveUnitId(d.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveUnitId(d.id);
                }
              }}
              aria-label={`${d.name} 선택`}
              className={activeUnitId === d.id ? 'ring-2 ring-accent' : ''}
            >
              <CardHeader>
                <CardTitle>{d.name}</CardTitle>
                <Badge tone="neutral" className="mono">{d.members.length}명</Badge>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="space-y-1.5">
                  {d.members.map(m => {
                    const u = userById(m);
                    return u ? (
                      <div key={m} className="flex items-center gap-2 text-[12px]">
                        <Avatar user={u} size={20} />
                        <span className="text-fg-1 flex-1 truncate">{u.name}</span>
                        <span className="text-[10.5px] text-fg-3">{u.role.split(' ')[0]}</span>
                      </div>
                    ) : (
                      <div key={m} className="text-[12px] text-fg-3 truncate">{m}</div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
