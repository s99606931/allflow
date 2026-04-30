'use client';

import { Card, CardBody, CardHeader, CardTitle, Button } from '@/components/ui/primitives';
import { Database, ExternalLink, Plus } from 'lucide-react';

/**
 * Notion 통합 화면 — 백엔드 모듈 미연결 상태.
 * 실 연동(OAuth + DB 매핑) 구현 전까지 정직한 placeholder UI 제공.
 */
export function NotionPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1280px] mx-auto">
      <Card className="!bg-bg-1 border-border">
        <CardBody className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-bg-elev grid place-items-center shrink-0 text-[18px]">📓</div>
          <div className="flex-1">
            <div className="text-[14px] font-bold text-fg">Notion 워크스페이스 미연결</div>
            <p className="text-[12.5px] text-fg-2 mt-0.5">
              Notion OAuth 연결 후 데이터베이스 단위로 양방향 동기화를 설정할 수 있습니다.
            </p>
          </div>
          <Button variant="primary" size="sm">
            <ExternalLink size={12} /> Notion 연결
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>연결된 데이터베이스</CardTitle>
          <Button variant="primary" size="sm" disabled>
            <Plus size={13} /> DB 추가
          </Button>
        </CardHeader>
        <CardBody>
          <div className="py-12 text-center">
            <Database size={36} className="mx-auto text-fg-3 opacity-50" />
            <div className="text-[13px] font-semibold text-fg mt-3">연결된 데이터베이스가 없습니다</div>
            <div className="text-[11.5px] text-fg-3 mt-1.5 max-w-md mx-auto">
              Notion 워크스페이스를 연결하면 DB 단위로 동기화 정책(주기·방향·필드 매핑)을 설정할 수 있습니다.
            </div>
            <Button variant="secondary" size="sm" className="mt-4">
              <ExternalLink size={12} /> 연결 가이드 보기
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>예정 기능</CardTitle></CardHeader>
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
