'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Avatar, Badge, Button } from '@/components/ui/primitives';
import { useOrgMutations, useOrgUnits } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';

import { Check, Pencil, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';

export function OrgPage() {
  const { data: units = [], isLoading, error } = useOrgUnits();
  const { invite, createUnit, updateUnit, deleteUnit } = useOrgMutations();
  const userMap = useUserMap();
  const [email, setEmail] = useState('');
  const [activeUnitId, setActiveUnitId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitParentId, setNewUnitParentId] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const filteredUnits = search.trim()
    ? units.filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
    : units;
  const rootUnits = filteredUnits.filter(u => u.parentId === null);
  const childUnits = filteredUnits.filter(u => u.parentId !== null);
  const targetUnitId = activeUnitId || childUnits[0]?.id || rootUnits[0]?.id || '';

  const onInvite = () => {
    if (!email || !targetUnitId) return;
    invite.mutate({ email, orgUnitId: targetUnitId, role: 'member' });
    setEmail('');
  };

  const onAddUnit = () => {
    if (!newUnitName.trim()) return;
    createUnit.mutate(
      { name: newUnitName.trim(), parentId: newUnitParentId || null },
      { onSuccess: () => { setAddUnitOpen(false); setNewUnitName(''); setNewUnitParentId(''); } },
    );
  };

  return (
    <div className="p-6 space-y-5 max-w-[1280px] mx-auto">
      <AiGuideWidget
        systemContext={`조직 관리 — ${units.length}개 부서, 총 ${units.reduce((acc, u) => acc + u.members.length, 0)}명`}
        hints={[
          units.length === 0 ? '조직 구조 처음 설정하는 방법 알려줘' : '팀 구조 현황 알려줘',
          units.some(u => u.members.length < 2) ? '인원 1명 이하 부서 확인해줘' : '인원 부족 부서 찾아줘',
          '온보딩 진행 현황 알려줘',
        ]}
      />
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="사람/팀 검색..."
            className="w-full h-8 pl-8 pr-3 rounded-md bg-bg-elev border border-border text-[12.5px] focus:outline-none focus:border-accent"
          />
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
        <Button variant="secondary" size="sm" onClick={() => setAddUnitOpen(v => !v)}><Plus size={13} /> 부서 추가</Button>
      </div>

      {addUnitOpen && (
        <Card>
          <CardBody className="!p-4 flex items-center gap-2 flex-wrap">
            <input
              autoFocus
              value={newUnitName}
              onChange={e => setNewUnitName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onAddUnit()}
              placeholder="부서명 입력..."
              className="h-8 flex-1 min-w-[160px] px-3 rounded-md border border-border bg-bg text-[13px] text-fg focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <select
              value={newUnitParentId}
              onChange={e => setNewUnitParentId(e.target.value)}
              className="h-8 px-2 rounded-md border border-border bg-bg text-[12.5px] text-fg"
            >
              <option value="">최상위 (없음)</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <Button variant="primary" size="sm" disabled={!newUnitName.trim() || createUnit.isPending} onClick={onAddUnit}>
              {createUnit.isPending ? '추가 중...' : '추가'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setAddUnitOpen(false); setNewUnitName(''); setNewUnitParentId(''); }}>
              <X size={12} />
            </Button>
          </CardBody>
        </Card>
      )}

      {isLoading && <div className="py-12 text-center text-[12px] text-fg-3">불러오는 중...</div>}
      {error && <div className="py-12 text-center text-[12px] text-danger">조직 정보를 불러오지 못했습니다.</div>}
      {!isLoading && !error && units.length === 0 && (
        <div className="py-12 text-center space-y-2">
          <div className="text-[13px] font-semibold text-fg">조직 단위가 없습니다</div>
          <div className="text-[12px] text-fg-3">우상단 &ldquo;+ 부서 추가&rdquo;를 눌러 팀/부서를 만드세요.</div>
        </div>
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
              onClick={() => { if (editingUnitId !== d.id) setActiveUnitId(d.id); }}
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
                {editingUnitId === d.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        updateUnit.mutate({ id: d.id, patch: { name: editingName } }, { onSuccess: () => setEditingUnitId(null) });
                      }
                      if (e.key === 'Escape') setEditingUnitId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 h-6 px-1.5 text-[13px] font-semibold rounded border border-accent focus:outline-none"
                  />
                ) : (
                  <CardTitle>{d.name}</CardTitle>
                )}
                <Badge tone="neutral" className="mono">{d.members.length}명</Badge>
                <div className="flex gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  {editingUnitId === d.id ? (
                    <>
                      <button type="button" onClick={() => updateUnit.mutate({ id: d.id, patch: { name: editingName } }, { onSuccess: () => setEditingUnitId(null) })} className="p-1 text-accent hover:text-accent-strong"><Check size={11} /></button>
                      <button type="button" onClick={() => setEditingUnitId(null)} className="p-1 text-fg-3 hover:text-fg"><X size={11} /></button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => { setEditingUnitId(d.id); setEditingName(d.name); }} className="p-1 text-fg-3 hover:text-accent"><Pencil size={11} /></button>
                      <button type="button" onClick={() => {
                        toast('부서를 삭제하시겠습니까?', {
                          action: { label: '삭제', onClick: () => deleteUnit.mutate(d.id) },
                          cancel: { label: '취소', onClick: () => {} },
                        });
                      }} className="p-1 text-fg-3 hover:text-danger"><Trash2 size={11} /></button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="space-y-1.5">
                  {d.members.map(m => {
                    const u = userMap.get(m);
                    if (!u) return <div key={m} className="text-[12px] text-fg-3 truncate">{m}</div>;
                    const status = (u as { userStatus?: string }).userStatus ?? '';
                    const dotColor =
                      status === '업무 중' ? 'bg-success' :
                      status === '집중 모드' || status === '회의 중' ? 'bg-warning' :
                      'bg-fg-3';
                    return (
                      <div key={m} className="flex items-center gap-2 text-[12px]">
                        <Avatar user={u} size={20} />
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`}
                          title={status || '상태 없음'}
                        />
                        <span className="text-fg-1 flex-1 truncate">{u.name}</span>
                        <span className="text-[10.5px] text-fg-3">{u.role.split(' ')[0]}</span>
                      </div>
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
