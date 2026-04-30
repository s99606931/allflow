'use client';

import { Card, CardBody } from '@/components/ui/primitives';
import { Settings2 } from 'lucide-react';

export function PageStub({ title, body }: { title: string; body?: string }) {
  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      <Card>
        <CardBody className="py-16 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-bg-2 grid place-items-center mb-4">
            <Settings2 size={20} className="text-fg-3" />
          </div>
          <div className="text-[15px] font-semibold text-fg">{title}</div>
          <p className="text-[12.5px] text-fg-2 mt-1">{body ?? '이 화면은 디자인 캔버스에서 모킹되었으며, 본 코드 패키지는 셸 + 대시보드 + 프로젝트 + 이슈를 우선 구현합니다.'}</p>
        </CardBody>
      </Card>
    </div>
  );
}

