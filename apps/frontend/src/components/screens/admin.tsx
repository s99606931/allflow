'use client';

import { Card, CardBody, CardHeader, CardTitle, Badge, Button } from '@/components/ui/primitives';
import { useHealth, useOrgMutations } from '@/lib/hooks/use-data';
import { useAuditLog } from '@/lib/hooks/use-admin';
import { Activity, AlertCircle, Cpu, ShieldAlert } from 'lucide-react';
import { LlmConnectionsPanel } from '@/components/admin/llm-connections-panel';
import { McpConnectionsPanel } from '@/components/admin/mcp-connections-panel';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';

/**
 * Format uptime seconds → "3d 4h 12m" / "6h 12m" / "12m" / "37s".
 */
function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ${minutes % 60}m`;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}초 전`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export function AdminPage() {
  const healthQuery = useHealth();
  const { revokeToken } = useOrgMutations();
  const health = healthQuery.data;
  const auditLogQuery = useAuditLog();

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <AiGuideWidget
        systemContext="관리자 — 시스템 상태·LLM 연결·MCP 서버·사용자 초대 관리 화면"
        hints={['시스템 상태 점검해줘', 'LLM 연결 설정 가이드해줘', 'MCP 서버 추가 방법 알려줘']}
      />
      {/* Real health (BE GET /health) */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardBody className="!p-3.5">
            <div className="flex items-center justify-between">
              <Activity size={13} className="text-success" />
              <Badge tone={health?.status === 'ok' ? 'success' : 'warning'}>
                {healthQuery.isLoading ? '...' : health?.status === 'ok' ? 'OK' : 'N/A'}
              </Badge>
            </div>
            <div className="text-[11px] text-fg-2 mt-1.5">상태</div>
            <div className="text-[20px] font-bold mono text-fg leading-none mt-1">
              {healthQuery.isLoading ? '—' : (health?.status ?? 'unknown')}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="!p-3.5">
            <div className="flex items-center justify-between">
              <Cpu size={13} className="text-success" />
              <Badge tone="success">live</Badge>
            </div>
            <div className="text-[11px] text-fg-2 mt-1.5">Uptime</div>
            <div className="text-[20px] font-bold mono text-fg leading-none mt-1">
              {healthQuery.isLoading ? '—' : health ? formatUptime(health.uptime) : '—'}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="!p-3.5">
            <div className="flex items-center justify-between">
              <ShieldAlert size={13} className="text-success" />
              <Badge tone="neutral">build</Badge>
            </div>
            <div className="text-[11px] text-fg-2 mt-1.5">Version</div>
            <div className="text-[20px] font-bold mono text-fg leading-none mt-1">
              {healthQuery.isLoading ? '—' : (health?.version ?? '—')}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader><CardTitle>워크스페이스 설정</CardTitle></CardHeader>
          <CardBody>
            <EmptyState
              icon={<AlertCircle size={28} className="text-fg-3" />}
              title="설정 백엔드 연결 필요"
              description="SSO / SCIM / 감사 로그 보존 등 정책 설정은 백엔드 모듈 연결 후 활성화됩니다."
            />
          </CardBody>
        </Card>

        <Card className="!bg-danger-soft border-danger/20">
          <CardHeader><CardTitle className="text-danger">위험 작업</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-full !text-danger"
              disabled={revokeToken.isPending}
              onClick={() => revokeToken.mutate({ tokenId: 'webhook-prod', reason: 'admin bulk revoke' })}
            >
              {revokeToken.isPending ? '회수 중...' : 'API 토큰 일괄 회수'}
            </Button>
            <div className="text-[11px] text-fg-3 px-1">
              세션 종료 / 워크스페이스 잠금은 백엔드 모듈 추가 후 노출됩니다.
            </div>
          </CardBody>
        </Card>
      </div>

      <LlmConnectionsPanel />
      <McpConnectionsPanel />

      <Card>
        <CardHeader>
          <CardTitle>실시간 감사 로그</CardTitle>
          <div className="flex items-center gap-2">
            {auditLogQuery.isSuccess && auditLogQuery.data.items.length > 0 && (() => {
              const counts = auditLogQuery.data.items.reduce<Record<string, number>>((acc, e) => {
                const prefix = e.action.split('.')[0] ?? e.action;
                acc[prefix] = (acc[prefix] ?? 0) + 1;
                return acc;
              }, {});
              return Object.entries(counts).map(([prefix, n]) => (
                <Badge key={prefix} tone="neutral" className="mono text-[10px]">{prefix} {n}</Badge>
              ));
            })()}
            <Badge tone={auditLogQuery.isSuccess ? 'success' : 'neutral'}>
              {auditLogQuery.isSuccess ? `${auditLogQuery.data.total}건` : '연결 중'}
            </Badge>
          </div>
        </CardHeader>
        <CardBody>
          {auditLogQuery.isLoading && (
            <div className="py-8 text-center text-[13px] text-fg-3">데이터 로딩 중...</div>
          )}
          {auditLogQuery.isError && (
            <EmptyState
              icon={<AlertCircle size={28} className="text-fg-3" />}
              title="감사 로그 불러오기 실패"
              description="잠시 후 다시 시도해 주세요."
            />
          )}
          {auditLogQuery.isSuccess && auditLogQuery.data.items.length === 0 && (
            <div className="py-8 text-center text-[13px] text-fg-3">감사 로그 없음</div>
          )}
          {auditLogQuery.isSuccess && auditLogQuery.data.items.length > 0 && (
            <div className="divide-y divide-line">
              {auditLogQuery.data.items.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-2.5 text-[12px]">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: entry.actor.color }}
                  >
                    {entry.actor.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-fg">{entry.actor.name}</span>
                    <span className="text-fg-3 mx-1.5">·</span>
                    <span className="font-mono text-fg-2">{entry.action}</span>
                    {entry.targetType && (
                      <span className="text-fg-3 ml-1.5">({entry.targetType})</span>
                    )}
                  </div>
                  <div className="text-fg-3 shrink-0">{formatRelativeTime(entry.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto opacity-50">{icon}</div>
      <div className="text-[13px] font-semibold text-fg mt-2.5">{title}</div>
      <div className="text-[11.5px] text-fg-3 mt-1 max-w-md mx-auto">{description}</div>
    </div>
  );
}
