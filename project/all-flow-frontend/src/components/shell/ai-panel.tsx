'use client';

import { Avatar, Badge, Button } from '@/components/ui/primitives';
import { ME } from '@/lib/fixtures';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import { ArrowUp, FileText, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

const SUGGEST = [
  '이번 주 회의록 요약해줘',
  '내가 담당한 P0 이슈 보여줘',
  '오늘 미팅 일정 정리',
  '대시보드 위젯 추가',
];

const STARTER_MSGS = [
  {
    role: 'ai' as const,
    text: '안녕하세요 지우님, 무엇을 도와드릴까요?',
    chips: ['📊 주간 리포트 생성', '📝 회의록 정리', '🔍 태스크 검색'],
  },
];

export function AIPanel() {
  const open = useUIStore(s => s.aiPanelOpen);
  const close = useUIStore(s => s.closeAIPanel);
  const [input, setInput] = useState('');
  const [msgs] = useState(STARTER_MSGS);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/20 z-30 transition-opacity',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={close}
        aria-hidden
      />

      {/* Panel */}
      <aside
        className={cn(
          'fixed top-0 right-0 h-screen w-[420px] max-w-[100vw] bg-bg-elev border-l border-border z-40 flex flex-col shadow-pop transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="h-14 px-5 border-b border-border flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-md bg-accent-soft grid place-items-center text-accent-strong">
            <Sparkles size={15} />
          </div>
          <div className="flex-1">
            <div className="text-[13.5px] font-semibold text-fg">AI 어시스턴트</div>
            <div className="text-[11px] text-fg-3">claude-haiku-4.5 · 워크스페이스 컨텍스트 활성</div>
          </div>
          <button
            className="text-fg-3 hover:text-fg-1 p-1"
            onClick={close}
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scroll p-5 space-y-4">
          {msgs.map((m, i) => (
            <Message key={i} {...m} />
          ))}
        </div>

        <div className="px-5 pb-3 pt-2 border-t border-border space-y-3 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {SUGGEST.map(s => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="text-[11.5px] px-2 py-1 rounded-md bg-bg-2 hover:bg-hover border border-border text-fg-1 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="relative">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="무엇이든 물어보세요..."
              rows={2}
              className="w-full resize-none rounded-lg bg-bg-1 border border-border px-3 py-2.5 pr-10 text-[13px] text-fg placeholder:text-fg-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-colors"
            />
            <button
              disabled={!input.trim()}
              className="absolute bottom-2 right-2 w-7 h-7 rounded-md bg-accent text-accent-fg grid place-items-center disabled:opacity-40 hover:bg-accent-strong transition-colors"
              aria-label="전송"
            >
              <ArrowUp size={14} />
            </button>
          </div>
          <div className="text-[10.5px] text-fg-3 flex items-center justify-between">
            <span>Enter로 전송 · Shift+Enter 줄바꿈</span>
            <span>↑ 답변 다시 생성</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function Message({ role, text, chips }: { role: 'ai' | 'user'; text: string; chips?: string[] }) {
  if (role === 'user') {
    return (
      <div className="flex gap-2.5 items-start justify-end">
        <div className="bg-accent-soft text-fg max-w-[80%] px-3 py-2 rounded-lg rounded-tr-sm text-[13px]">
          {text}
        </div>
        <Avatar user={ME} size={28} />
      </div>
    );
  }
  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-7 h-7 rounded-md bg-accent text-accent-fg grid place-items-center shrink-0">
        <Sparkles size={13} />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="text-[13px] text-fg leading-relaxed">{text}</div>
        {chips && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map(c => (
              <Button key={c} variant="secondary" size="sm">{c}</Button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 text-[10.5px] text-fg-3">
          <Badge tone="accent" className="!h-4 !text-[10px]">AI</Badge>
          <FileText size={11} />
          <span>3개 워크스페이스 문서 참조</span>
        </div>
      </div>
    </div>
  );
}
