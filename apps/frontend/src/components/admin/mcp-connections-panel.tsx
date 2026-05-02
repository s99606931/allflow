'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Badge, Button } from '@/components/ui/primitives';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useMcpConnections, useMcpConnectionMutations } from '@/lib/hooks/use-data';
import type { McpConnectionInput } from '@/lib/api/extended';

export function McpConnectionsPanel() {
  const list = useMcpConnections();
  const mut = useMcpConnectionMutations();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<McpConnectionInput>({
    name: '', transport: 'sse', config: {}, isEnabled: true,
  });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await mut.create.mutateAsync(form);
    setForm({ name: '', transport: 'sse', config: {}, isEnabled: true });
    setShowForm(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>MCP 연결 관리</CardTitle>
        <Badge tone={list.isSuccess ? 'neutral' : 'neutral'}>
          {list.isSuccess ? `${list.data.length}건` : '로딩 중'}
        </Badge>
        <Button size="sm" variant="primary" className="ml-auto" onClick={() => setShowForm(v => !v)}>
          <Plus size={13} /> 추가
        </Button>
      </CardHeader>
      <CardBody className="space-y-3">
        {showForm && (
          <div className="grid grid-cols-[1fr_120px_auto] gap-2 p-3 rounded-lg border border-border bg-bg-2">
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="연결 이름"
              className="h-8 px-3 rounded-md border border-border bg-bg text-[12.5px] text-fg focus:outline-none focus:border-accent"
            />
            <select
              value={form.transport}
              onChange={e => setForm(f => ({ ...f, transport: e.target.value as McpConnectionInput['transport'] }))}
              className="h-8 px-2 rounded-md border border-border bg-bg text-[12.5px] text-fg focus:outline-none focus:border-accent"
            >
              <option value="sse">SSE</option>
              <option value="stdio">Stdio</option>
            </select>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="primary" disabled={mut.create.isPending || !form.name.trim()} onClick={handleCreate}>
                {mut.create.isPending ? '등록 중...' : '등록'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>취소</Button>
            </div>
          </div>
        )}
        {list.isLoading && <div className="py-6 text-center text-[12px] text-fg-3">불러오는 중...</div>}
        {list.isSuccess && list.data.length === 0 && !showForm && (
          <div className="py-6 text-center text-[12px] text-fg-3">등록된 MCP 연결이 없습니다.</div>
        )}
        {list.isSuccess && list.data.map(conn => (
          <div key={conn.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-fg truncate">{conn.name}</div>
              <div className="text-[11px] text-fg-3 mono">{conn.transport} · {conn.id.slice(0, 8)}</div>
            </div>
            <Badge tone={conn.isEnabled ? 'success' : 'neutral'}>{conn.isEnabled ? '활성' : '비활성'}</Badge>
            <button
              type="button"
              aria-label={conn.isEnabled ? '비활성화' : '활성화'}
              disabled={mut.toggle.isPending}
              onClick={() => mut.toggle.mutate({ id: conn.id, isEnabled: !conn.isEnabled })}
              className="text-fg-3 hover:text-fg transition-colors"
            >
              {conn.isEnabled ? <ToggleRight size={18} className="text-accent" /> : <ToggleLeft size={18} />}
            </button>
            <button
              type="button"
              aria-label="삭제"
              disabled={mut.remove.isPending}
              onClick={() => { if (window.confirm(`"${conn.name}" MCP 연결을 삭제하시겠습니까?`)) mut.remove.mutate(conn.id); }}
              className="text-fg-3 hover:text-danger transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
