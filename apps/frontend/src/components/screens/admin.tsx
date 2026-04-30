'use client';

import { Card, CardBody, CardHeader, CardTitle, Badge, Button } from '@/components/ui/primitives';
import { useHealth, useOrgMutations } from '@/lib/hooks/use-data';
import { Activity, AlertCircle, Cpu, ShieldAlert } from 'lucide-react';
import { LlmConnectionsPanel } from '@/components/admin/llm-connections-panel';

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

export function AdminPage() {
  const healthQuery = useHealth();
  const { revokeToken } = useOrgMutations();
  const health = healthQuery.data;

  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
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

      <Card>
        <CardHeader><CardTitle>실시간 감사 로그</CardTitle><Badge tone="neutral">미연결</Badge></CardHeader>
        <CardBody>
          <EmptyState
            icon={<AlertCircle size={28} className="text-fg-3" />}
            title="감사 로그 백엔드 미연결"
            description="감사 로그 모듈이 아직 백엔드에 노출되지 않았습니다. 추후 사이클에서 GET /audit-log 와 연결됩니다."
          />
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
