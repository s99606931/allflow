/**
 * QuickCreateMenu — 사이드바 "새로 만들기" 버튼의 팝오버 메뉴.
 *
 * 4종(작업/이벤트/문서/이슈) 빠른 생성 진입점을 제공한다.
 * 각 항목 선택 시 부모(Sidebar)에 어떤 다이얼로그를 열지 위임한다.
 *
 * 부모는 동일한 다이얼로그 인스턴스를 명령 팔레트(`allflow:action`)와
 * 공유하므로 단일 진실 공급원 + DRY를 유지한다.
 */
'use client';

import * as Popover from '@radix-ui/react-popover';
import { AlertCircle, Calendar, CheckSquare, FileText, Plus } from 'lucide-react';

export type QuickCreateKind = 'task' | 'event' | 'doc' | 'issue';

interface Props {
  /** 트리거 버튼 라벨 표시 여부. collapsed 사이드바에서는 false. */
  showLabel?: boolean;
  onSelect: (kind: QuickCreateKind) => void;
}

interface MenuItem {
  kind: QuickCreateKind;
  label: string;
  hint: string;
  icon: typeof CheckSquare;
}

const ITEMS: MenuItem[] = [
  { kind: 'task', label: '작업', hint: '할 일 / 마감 추적', icon: CheckSquare },
  { kind: 'event', label: '이벤트', hint: '회의 / 일정', icon: Calendar },
  { kind: 'doc', label: '문서', hint: '위키 / 노트', icon: FileText },
  { kind: 'issue', label: '이슈', hint: '버그 / 요청 트래킹', icon: AlertCircle },
];

export function QuickCreateMenu({ showLabel = true, onSelect }: Props) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="새로 만들기"
          className={
            showLabel
              ? 'w-full h-9 px-2.5 rounded-md bg-accent text-accent-fg text-[12.5px] font-medium flex items-center gap-1.5 hover:bg-accent-strong transition-colors'
              : 'w-full h-9 grid place-items-center rounded-md bg-accent text-accent-fg hover:bg-accent-strong transition-colors'
          }
        >
          <Plus size={14} />
          {showLabel && <span>새로 만들기</span>}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={8}
          className="z-50 w-[260px] rounded-lg border border-border bg-bg-elev shadow-pop p-1 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-3">
            빠른 생성
          </div>
          {ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <Popover.Close asChild key={item.kind}>
                <button
                  type="button"
                  onClick={() => onSelect(item.kind)}
                  className="w-full flex items-center gap-3 px-2.5 h-11 rounded-md text-left text-[12.5px] text-fg-1 hover:bg-hover transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-bg-1 border border-border grid place-items-center text-fg-2 shrink-0">
                    <Icon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-fg truncate">{item.label}</div>
                    <div className="text-[10.5px] text-fg-3 truncate">{item.hint}</div>
                  </div>
                </button>
              </Popover.Close>
            );
          })}
          <Popover.Arrow className="fill-bg-elev" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
