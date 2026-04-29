'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Avatar, Badge, Button } from '@/components/ui/primitives';
import { userById } from '@/lib/fixtures';
import { useOrgMutations } from '@/lib/hooks/use-data';
import { Plus, Search, UserPlus } from 'lucide-react';

const ORG = [
  { id: 'ceo', name: '윤재석', role: 'CTO / 대표', dept: '경영진', userId: 'u6', children: ['eng', 'product', 'marketing'] },
];

const DEPTS = [
  { id: 'eng', name: '엔지니어링', head: 'u2', count: 5, members: ['u2', 'u3', 'u4'] },
  { id: 'product', name: '프로덕트', head: 'me', count: 2, members: ['me'] },
  { id: 'design', name: '디자인', head: 'u1', count: 2, members: ['u1'] },
  { id: 'marketing', name: '마케팅', head: 'u5', count: 3, members: ['u5'] },
];

export function OrgPage() {
  const ceo = userById('u6')!;
  const { invite } = useOrgMutations();
  const [email, setEmail] = useState('');

  const onInvite = (orgUnitId: string) => {
    if (!email) return;
    invite.mutate({ email, orgUnitId, role: 'member' });
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
          disabled={invite.isPending || !email}
          onClick={() => onInvite('eng')}
        >
          <UserPlus size={13} /> {invite.isPending ? '전송 중...' : '초대'}
        </Button>
        <Button variant="secondary" size="sm"><Plus size={13} /> 부서 추가</Button>
      </div>

      {/* CEO node */}
      <div className="flex flex-col items-center">
        <Card className="w-64 text-center">
          <CardBody className="!p-4">
            <Avatar user={ceo} size={56} className="mx-auto" />
            <div className="text-[14px] font-bold text-fg mt-2">{ceo.name}</div>
            <div className="text-[11.5px] text-fg-2">{ceo.role}</div>
            <Badge tone="accent" className="mt-1.5">CEO</Badge>
          </CardBody>
        </Card>
        <div className="w-px h-8 bg-border" />
        <div className="h-px w-full bg-border max-w-3xl" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {DEPTS.map(d => {
          const head = userById(d.head);
          return (
            <Card key={d.id} hoverable>
              <CardHeader>
                <CardTitle>{d.name}</CardTitle>
                <Badge tone="neutral" className="mono">{d.count}명</Badge>
              </CardHeader>
              <CardBody className="space-y-3">
                {head && (
                  <div className="flex items-center gap-2.5 p-2 rounded-md bg-accent-soft">
                    <Avatar user={head} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold text-fg truncate">{head.name}</div>
                      <div className="text-[10.5px] text-accent-strong">팀장 · {head.role}</div>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  {d.members.filter(m => m !== d.head).map(m => {
                    const u = userById(m);
                    return u ? (
                      <div key={m} className="flex items-center gap-2 text-[12px]">
                        <Avatar user={u} size={20} />
                        <span className="text-fg-1 flex-1 truncate">{u.name}</span>
                        <span className="text-[10.5px] text-fg-3">{u.role.split(' ')[0]}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
