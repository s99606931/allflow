'use client';

/**
 * LLM Connections admin panel.
 *
 * Lets admins register multiple LLM endpoints (local: LMStudio/Ollama,
 * commercial: OpenAI/Anthropic) and switch the active default at runtime.
 *
 * Wires:
 *   - GET    /llm-connections           list (table)
 *   - POST   /llm-connections           create (modal)
 *   - PATCH  /llm-connections/:id       edit (modal)
 *   - DELETE /llm-connections/:id       delete (row action)
 *   - POST   /llm-connections/:id/activate  set active (row action)
 *   - POST   /llm-connections/:id/test  ping (row action)
 */

import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '@/components/ui/primitives';
import { Dialog, DialogField, DialogFooter, Select, TextInput } from '@/components/ui/dialog';
import { useLlmConnectionMutations, useLlmConnections } from '@/lib/hooks/use-data';
import type { LlmConnection, LlmConnectionInput, LlmKind } from '@/lib/api/extended';
import { Activity, CheckCircle2, Plus, Trash2, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

const KIND_OPTIONS: { value: LlmKind; label: string }[] = [
  { value: 'lmstudio', label: 'LMStudio (local)' },
  { value: 'ollama', label: 'Ollama (local)' },
  { value: 'openai', label: 'OpenAI (commercial)' },
  { value: 'anthropic', label: 'Anthropic (commercial)' },
  { value: 'custom_openai_compat', label: 'Custom OpenAI-compatible' },
];

const LOCAL_KINDS: LlmKind[] = ['lmstudio', 'ollama', 'custom_openai_compat'];

const KIND_DEFAULTS: Record<LlmKind, { baseUrl: string; model: string }> = {
  lmstudio: { baseUrl: 'http://192.168.0.104:1234', model: 'gemma-4-e4b-it' },
  ollama: { baseUrl: 'http://localhost:11434', model: 'llama3.1' },
  openai: { baseUrl: 'https://api.openai.com', model: 'gpt-4o-mini' },
  anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-haiku-4-5' },
  custom_openai_compat: { baseUrl: 'http://localhost:8080', model: 'custom-model' },
};

type DialogMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; conn: LlmConnection };

export function LlmConnectionsPanel() {
  const list = useLlmConnections();
  const mut = useLlmConnectionMutations();
  const [dialog, setDialog] = useState<DialogMode>({ kind: 'closed' });

  const rows = list.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM 연결 관리</CardTitle>
        <Badge tone="accent">{rows.length}개 등록</Badge>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setDialog({ kind: 'create' })}
          aria-label="LLM 연결 추가"
        >
          <Plus size={13} /> 추가
        </Button>
      </CardHeader>
      <CardBody className="space-y-2">
        {list.isLoading ? (
          <div className="py-6 text-center text-fg-3 text-[12.5px]">로딩 중…</div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-center text-fg-3 text-[12.5px]">
            등록된 LLM 연결이 없습니다. 우상단 [추가]로 첫 연결을 등록하세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-fg-3 border-b border-border">
                  <th className="py-2 pr-3">상태</th>
                  <th className="py-2 pr-3">이름</th>
                  <th className="py-2 pr-3">유형</th>
                  <th className="py-2 pr-3">엔드포인트 / 모델</th>
                  <th className="py-2 pr-3 text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <ConnectionRow
                    key={r.id}
                    conn={r}
                    onEdit={() => setDialog({ kind: 'edit', conn: r })}
                    onActivate={() => mut.activate.mutate(r.id)}
                    onTest={() => mut.test.mutate(r.id)}
                    onDelete={() => {
                      if (
                        window.confirm(`"${r.name}" 연결을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)
                      ) {
                        mut.remove.mutate(r.id);
                      }
                    }}
                    isPending={
                      mut.activate.isPending ||
                      mut.test.isPending ||
                      mut.remove.isPending
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {dialog.kind !== 'closed' && (
          <ConnectionDialog
            initial={dialog.kind === 'edit' ? dialog.conn : undefined}
            onClose={() => setDialog({ kind: 'closed' })}
            onSubmit={async (input) => {
              if (dialog.kind === 'edit') {
                await mut.update.mutateAsync({ id: dialog.conn.id, input });
              } else {
                await mut.create.mutateAsync(input);
              }
              setDialog({ kind: 'closed' });
            }}
            submitting={mut.create.isPending || mut.update.isPending}
          />
        )}
      </CardBody>
    </Card>
  );
}

function ConnectionRow({
  conn,
  onEdit,
  onActivate,
  onTest,
  onDelete,
  isPending,
}: {
  conn: LlmConnection;
  onEdit: () => void;
  onActivate: () => void;
  onTest: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-2 pr-3">
        {conn.isActive ? (
          <Badge tone="success">
            <CheckCircle2 size={10} /> 활성
          </Badge>
        ) : (
          <Badge tone="neutral">대기</Badge>
        )}
        {conn.isDefault && (
          <span className="ml-1 text-[10px] text-fg-3" title="시드된 기본 연결 (삭제 불가)">
            기본
          </span>
        )}
      </td>
      <td className="py-2 pr-3 font-semibold text-fg">{conn.name}</td>
      <td className="py-2 pr-3">
        <Badge tone={LOCAL_KINDS.includes(conn.kind) ? 'accent' : 'warning'}>
          {conn.kind}
        </Badge>
      </td>
      <td className="py-2 pr-3 mono text-[11.5px] text-fg-2">
        <div className="truncate max-w-[260px]" title={conn.baseUrl}>
          {conn.baseUrl}
        </div>
        <div className="truncate max-w-[260px] text-fg-3" title={conn.model}>
          → {conn.model}
        </div>
      </td>
      <td className="py-2 pr-3 text-right">
        <div className="inline-flex gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={onTest}
            disabled={isPending}
            title="연결 테스트"
          >
            <Activity size={12} /> 테스트
          </Button>
          {!conn.isActive && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onActivate}
              disabled={isPending}
              title="활성화"
            >
              <Zap size={12} /> 활성화
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            disabled={isPending}
          >
            편집
          </Button>
          {!conn.isDefault && !conn.isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isPending}
              className="!text-danger"
              aria-label="삭제"
            >
              <Trash2 size={12} />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function ConnectionDialog({
  initial,
  onClose,
  onSubmit,
  submitting,
}: {
  initial?: LlmConnection;
  onClose: () => void;
  onSubmit: (input: LlmConnectionInput) => Promise<void>;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? 'LMStudio (local)');
  const [kind, setKind] = useState<LlmKind>(initial?.kind ?? 'lmstudio');
  const [baseUrl, setBaseUrl] = useState(
    initial?.baseUrl ?? KIND_DEFAULTS.lmstudio.baseUrl,
  );
  const [model, setModel] = useState(initial?.model ?? KIND_DEFAULTS.lmstudio.model);
  const [apiKey, setApiKey] = useState('');

  const isLocal = useMemo(() => LOCAL_KINDS.includes(kind), [kind]);

  const onKindChange = (next: LlmKind) => {
    setKind(next);
    if (!initial) {
      // Pre-fill defaults only on create dialog.
      const d = KIND_DEFAULTS[next];
      setBaseUrl(d.baseUrl);
      setModel(d.model);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    await onSubmit({
      name: name.trim(),
      kind,
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      apiKey: isLocal ? null : apiKey.trim() || null,
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={initial ? 'LLM 연결 편집' : 'LLM 연결 추가'}
      description="로컬LLM(LMStudio/Ollama) 또는 상용LLM(OpenAI/Anthropic) 엔드포인트를 등록합니다."
      size="md"
    >
      <form onSubmit={submit} className="space-y-3">
        <DialogField label="이름" required>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: LMStudio (local)"
            required
          />
        </DialogField>

        <DialogField label="유형" required>
          <Select value={kind} onChange={(e) => onKindChange(e.target.value as LlmKind)}>
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </DialogField>

        <DialogField
          label="Base URL"
          required
          hint="OpenAI 호환 서버 루트. 코드가 자동으로 /v1/chat/completions 를 추가합니다."
        >
          <TextInput
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://192.168.0.104:1234"
            type="url"
            required
          />
        </DialogField>

        <DialogField label="모델 ID" required>
          <TextInput
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gemma-4-e4b-it"
            required
          />
        </DialogField>

        {!isLocal && (
          <DialogField
            label="API Key"
            hint={initial ? '비워두면 기존 키를 유지합니다.' : '상용 LLM은 API 키가 필요합니다.'}
          >
            <TextInput
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              type="password"
              autoComplete="off"
            />
          </DialogField>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? '저장 중…' : initial ? '저장' : '추가'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
