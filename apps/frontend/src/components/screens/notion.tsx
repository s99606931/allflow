'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Button } from '@/components/ui/primitives';
import { Database, ExternalLink, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useNotionConnections, useConnectNotion, useDisconnectNotion } from '@/lib/hooks/use-notion';

interface ConnectFormState {
  workspaceName: string;
  workspaceId: string;
}

const EMPTY_FORM: ConnectFormState = { workspaceName: '', workspaceId: '' };

export function NotionPage() {
  const { data: connections, isLoading, error } = useNotionConnections();
  const connectMutation = useConnectNotion();
  const disconnectMutation = useDisconnectNotion();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ConnectFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const hasConnections = connections && connections.length > 0;

  function handleOpenForm() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.workspaceName.trim() || !form.workspaceId.trim()) {
      setFormError('워크스페이스 이름과 ID를 모두 입력하세요.');
      return;
    }
    try {
      await connectMutation.mutateAsync({
        workspaceName: form.workspaceName.trim(),
        workspaceId: form.workspaceId.trim(),
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '연결에 실패했습니다.');
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-[1280px] mx-auto">
      {/* Dev mode notice */}
      <Card className="!bg-bg-1 border-border">
        <CardBody className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-bg-elev grid place-items-center shrink-0 text-[18px]">
            📓
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-bold text-fg flex items-center gap-2">
              Notion 통합
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                <AlertCircle size={10} /> OAuth 설정 필요 — 현재 개발 모드
              </span>
            </div>
            <p className="text-[12.5px] text-fg-2 mt-0.5">
              프로덕션에서는 <code className="text-[11px] bg-bg-elev px-1 rounded">NOTION_CLIENT_ID</code> /
              <code className="text-[11px] bg-bg-elev px-1 rounded ml-1">NOTION_CLIENT_SECRET</code> 환경 변수가
              필요합니다. 개발 모드에서는 워크스페이스 정보를 직접 입력해 연결을 테스트할 수 있습니다.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => window.open('https://developers.notion.com/docs/authorization', '_blank', 'noopener,noreferrer')}>
            <ExternalLink size={12} /> OAuth 가이드
          </Button>
        </CardBody>
      </Card>

      {/* Connected workspaces */}
      <Card>
        <CardHeader>
          <CardTitle>연결된 워크스페이스</CardTitle>
          <Button variant="primary" size="sm" onClick={handleOpenForm} disabled={showForm}>
            <Plus size={13} /> 연결하기 (개발 모드)
          </Button>
        </CardHeader>
        <CardBody>
          {isLoading && (
            <div className="py-8 text-center text-[12.5px] text-fg-3">불러오는 중...</div>
          )}

          {error && (
            <div className="py-8 text-center text-[12.5px] text-red-500">
              연결 목록을 불러오는 데 실패했습니다.
            </div>
          )}

          {!isLoading && !error && !hasConnections && !showForm && (
            <div className="py-12 text-center">
              <Database size={36} className="mx-auto text-fg-3 opacity-50" />
              <div className="text-[13px] font-semibold text-fg mt-3">
                연결된 워크스페이스가 없습니다
              </div>
              <div className="text-[11.5px] text-fg-3 mt-1.5 max-w-md mx-auto">
                상단 버튼으로 개발 모드 연결을 추가하거나, 프로덕션에서 Notion OAuth를 설정하세요.
              </div>
            </div>
          )}

          {!isLoading && !error && hasConnections && (
            <ul className="divide-y divide-border">
              {connections.map((conn) => (
                <li key={conn.id} className="flex items-center justify-between py-3 px-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-bg-elev grid place-items-center text-[15px]">
                      📓
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-fg">{conn.workspaceName}</div>
                      <div className="text-[11px] text-fg-3">
                        연결됨 {new Date(conn.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => disconnectMutation.mutate(conn.id)}
                    disabled={disconnectMutation.isPending}
                  >
                    <Trash2 size={13} />
                    연결 해제
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {/* Inline connect form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="mt-2 border border-border rounded-lg p-4 space-y-3 bg-bg-elev/40">
              <div className="text-[12.5px] font-semibold text-fg">워크스페이스 연결 (개발 모드)</div>
              {formError && (
                <div className="text-[11.5px] text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} /> {formError}
                </div>
              )}
              <div className="space-y-2">
                <label className="block text-[11.5px] text-fg-2">
                  워크스페이스 이름
                  <input
                    type="text"
                    value={form.workspaceName}
                    onChange={(e) => setForm((f) => ({ ...f, workspaceName: e.target.value }))}
                    placeholder="예: My Company"
                    className="mt-1 w-full rounded border border-border bg-bg-1 px-2.5 py-1.5 text-[12.5px] text-fg focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="block text-[11.5px] text-fg-2">
                  워크스페이스 ID
                  <input
                    type="text"
                    value={form.workspaceId}
                    onChange={(e) => setForm((f) => ({ ...f, workspaceId: e.target.value }))}
                    placeholder="예: abc123 (임의 고유값)"
                    className="mt-1 w-full rounded border border-border bg-bg-1 px-2.5 py-1.5 text-[12.5px] text-fg focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={handleCloseForm}>
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? '연결 중...' : '연결'}
                </Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>

      {/* Planned features */}
      <Card>
        <CardHeader>
          <CardTitle>예정 기능</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-3 text-[12.5px] text-fg-2">
          <div className="rounded border border-border p-3">
            <div className="font-semibold text-fg-1 mb-1">양방향 동기화</div>
            <div className="text-[11.5px]">ALL-Flow ↔ Notion 변경분을 5분 단위로 반영.</div>
          </div>
          <div className="rounded border border-border p-3">
            <div className="font-semibold text-fg-1 mb-1">자동 매핑</div>
            <div className="text-[11.5px]">Notion 속성과 ALL-Flow 필드를 추론으로 1:1 매핑.</div>
          </div>
          <div className="rounded border border-border p-3">
            <div className="font-semibold text-fg-1 mb-1">충돌 해결 정책</div>
            <div className="text-[11.5px]">최종 수정 우선 / ALL-Flow 우선 / 수동 검토 선택.</div>
          </div>
          <div className="rounded border border-border p-3">
            <div className="font-semibold text-fg-1 mb-1">댓글 연동</div>
            <div className="text-[11.5px]">Notion 페이지 댓글이 태스크 댓글로 노출됩니다.</div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
