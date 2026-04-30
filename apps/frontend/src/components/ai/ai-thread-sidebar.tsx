'use client';

import { useAiThreadMutations, useAiThreads, type AiThread } from '@/lib/hooks/use-data';
import { cn } from '@/lib/utils';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';

interface Props {
  activeThreadId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

function ThreadItem({
  thread,
  active,
  onSelect,
  onRemove,
}: {
  thread: AiThread;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-[12px] transition-colors',
        active ? 'bg-accent-soft text-accent-strong' : 'hover:bg-hover text-fg-2',
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <MessageSquare size={11} className="shrink-0 opacity-60" />
      <span className="flex-1 truncate">{thread.title}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"
        aria-label="스레드 삭제"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
}

export function AiThreadSidebar({ activeThreadId, onSelect, onNew }: Props) {
  const { data: threads = [], isLoading } = useAiThreads();
  const { remove } = useAiThreadMutations();

  return (
    <div className="w-[140px] shrink-0 border-r border-border flex flex-col bg-bg min-h-0">
      <div className="px-2 py-2 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-semibold text-fg-3 uppercase tracking-wider">대화</span>
        <button
          type="button"
          onClick={onNew}
          className="p-0.5 rounded hover:bg-hover text-fg-3 hover:text-fg transition-colors"
          aria-label="새 대화"
          title="새 대화"
        >
          <Plus size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 min-h-0">
        {isLoading && (
          <div className="text-[11px] text-fg-3 px-2 py-2">로딩 중…</div>
        )}
        {!isLoading && threads.length === 0 && (
          <div className="text-[11px] text-fg-3 px-2 py-2">대화 없음</div>
        )}
        {threads.map((thread) => (
          <ThreadItem
            key={thread.id}
            thread={thread}
            active={thread.id === activeThreadId}
            onSelect={() => onSelect(thread.id)}
            onRemove={() => remove.mutate(thread.id)}
          />
        ))}
      </div>
    </div>
  );
}
