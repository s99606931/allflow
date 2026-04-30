'use client';

import { useMemo, useState } from 'react';
import { Avatar, Button, IconButton } from '@/components/ui/primitives';
import { Hash, Lock, Plus, Search, Sparkles, MessageSquare, Pin, X } from 'lucide-react';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import { Composer } from '@/components/chat/composer';
import { ThreadPanel, type ThreadMessage } from '@/components/chat/thread-panel';
import { MentionPopover } from '@/components/chat/mention-popover';
import { useChannels, useMe, useTaskMutations } from '@/lib/hooks/use-data';
import { useChatMessages, useSendMessage } from '@/lib/hooks/use-chat-messages';
import { useTranslation } from '@/lib/i18n';

export function ChatPage() {
  const { t } = useTranslation();
  const userMap = useUserMap();
  const { data: me } = useMe();
  const { data: channels = [], isLoading: channelsLoading, error: channelsError } = useChannels();
  const [activeId, setActiveId] = useState<string>('');
  const active = activeId || channels[0]?.id || '';
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [extractedDismissed, setExtractedDismissed] = useState(false);
  const taskMutations = useTaskMutations();
  const sendMessage = useSendMessage();

  const { data: messages = [] } = useChatMessages(active || null);

  const publicChannels = channels.filter(c => c.kind === 'public' || c.kind === 'private');
  const dmChannels = channels.filter(c => c.kind === 'dm');
  const activeChannel = channels.find(c => c.id === active) ?? null;

  const threadParent = useMemo<ThreadMessage | null>(() => {
    const found = messages.find(m => m.id === openThreadId);
    if (!found) return null;
    return {
      id: found.id,
      who: found.author?.initials ?? '?',
      time: new Date(found.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      text: found.content,
    };
  }, [openThreadId, messages]);

  const onCreateTaskFromAI = async (text: string) => {
    const bullet = text.match(/•\s+"?([^"\n]+)"?/);
    const title = bullet ? bullet[1].trim() : '채팅에서 추출된 액션';
    await taskMutations.create.mutateAsync({
      title,
      proj: 'PRJ-204',
      assignee: me?.id ?? '',
    });
    setExtractedDismissed(true);
  };

  const onSent = async (text: string) => {
    if (!active) return;
    await sendMessage.mutateAsync({ channelId: active, text });
  };

  return (
    <div className="grid grid-cols-[260px_1fr_320px] h-[calc(100vh-56px)] border-t border-border">
      {/* Channels sidebar */}
      <div className="bg-bg-1 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
            <input placeholder="채널/사람 검색..." className="w-full h-8 pl-8 pr-3 rounded-md bg-bg-2 border border-border text-[12px] focus:outline-none focus:border-accent" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scroll p-2">
          <div className="px-2 pt-2 pb-1 flex items-center justify-between">
            <span className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold">채널</span>
            <button className="text-fg-3 hover:text-fg-1"><Plus size={12} /></button>
          </div>
          {channelsLoading && <div className="px-3 py-4 text-[12px] text-fg-3">불러오는 중...</div>}
          {channelsError && <div className="px-3 py-4 text-[12px] text-danger">채널 로딩 실패</div>}
          {!channelsLoading && !channelsError && channels.length === 0 && (
            <div className="px-3 py-4 text-[12px] text-fg-3">채널이 없습니다.</div>
          )}
          {publicChannels.map(c => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`w-full flex items-center gap-2 px-2 h-7 rounded text-[12.5px] transition-colors ${
                active === c.id ? 'bg-accent-soft text-accent-strong font-semibold' : 'text-fg-1 hover:bg-hover'
              }`}>
              {c.kind === 'private' ? <Lock size={12} /> : <Hash size={12} />}
              <span className="flex-1 text-left truncate">{c.name}</span>
            </button>
          ))}
          {dmChannels.length > 0 && (
            <>
              <div className="px-2 pt-4 pb-1 flex items-center justify-between">
                <span className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold">DM</span>
                <button className="text-fg-3 hover:text-fg-1"><Plus size={12} /></button>
              </div>
              {dmChannels.map(c => (
                <button key={c.id} onClick={() => setActiveId(c.id)}
                  className={`w-full flex items-center gap-2 px-2 h-7 rounded text-[12.5px] transition-colors ${
                    active === c.id ? 'bg-accent-soft text-accent-strong font-semibold' : 'text-fg-1 hover:bg-hover'
                  }`}>
                  <Hash size={12} />
                  <span className="flex-1 text-left truncate">{c.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex flex-col bg-bg">
        <header className="h-14 px-5 border-b border-border flex items-center gap-2 shrink-0">
          <Hash size={14} className="text-fg-2" />
          <h2 className="text-[14px] font-bold text-fg">{activeChannel?.name ?? '채널 선택'}</h2>
          {activeChannel && <span className="text-[12px] text-fg-3">· {activeChannel.members.length}명</span>}
          <div className="flex-1" />
          <IconButton size="sm"><Pin size={13} /></IconButton>
          <IconButton size="sm"><Search size={13} /></IconButton>
          <Button variant="secondary" size="sm"><Sparkles size={12} /> 대화 요약</Button>
        </header>

        <div className="flex-1 overflow-y-auto scroll p-5 space-y-4">
          {messages.map(m => {
            const isAi = m.authorId === 'ai';
            if (isAi) {
              return (
                <div key={m.id} className="flex gap-2.5 rounded-lg border border-accent/20 bg-accent-soft p-3">
                  <div className="w-7 h-7 rounded-md bg-accent text-accent-fg grid place-items-center shrink-0"><Sparkles size={13} /></div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12.5px] font-semibold text-accent-strong">AI 어시스턴트</span>
                      <span className="text-[10.5px] text-fg-3">
                        {new Date(m.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    </div>
                    <div className="text-[12.5px] text-fg-1 mt-0.5 whitespace-pre-wrap">{m.content}</div>
                    {!extractedDismissed && (
                      <div className="flex gap-1.5 mt-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onCreateTaskFromAI(m.content)}
                          disabled={taskMutations.create.isPending}
                        >
                          {t('chat.toTask')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setExtractedDismissed(true)}>무시</Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            const u = userMap.get(m.authorId);
            const mine = m.authorId === me?.id;
            const displayUser = u ?? { name: m.author?.name ?? m.authorId, initials: m.author?.initials ?? '?', color: m.author?.color ?? '#888' };
            const msgTime = new Date(m.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
            return (
              <div key={m.id} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                <Avatar user={displayUser} size={32} />
                <div className={`flex-1 min-w-0 ${mine ? 'text-right' : ''}`}>
                  <div className={`flex items-baseline gap-2 ${mine ? 'justify-end' : ''}`}>
                    <span className="text-[12.5px] font-semibold text-fg">{displayUser.name}</span>
                    <span className="text-[10.5px] text-fg-3">{msgTime}</span>
                  </div>
                  <div className={`inline-block rounded-lg px-3 py-2 text-[13px] leading-relaxed mt-1 max-w-[600px] text-left ${
                    mine ? 'bg-accent-soft text-fg' : 'bg-bg-1 border border-border text-fg-1'
                  }`}>
                    {m.content}
                  </div>
                  {m.replyCount > 0 && (
                    <div className={`flex items-center gap-1.5 mt-1 text-[11px] text-accent-strong ${mine ? 'justify-end' : ''}`}>
                      <MessageSquare size={11} />
                      <button
                        type="button"
                        className="hover:underline"
                        onClick={() => setOpenThreadId(m.id)}
                        aria-label={t('chat.thread')}
                      >
                        {m.replyCount}개 답글
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <div className="relative p-3 border-t border-border bg-bg-1">
          <Composer channelId={active} onSent={onSent} onMention={() => setMentionOpen(true)} />
          <MentionPopover
            open={mentionOpen}
            onClose={() => setMentionOpen(false)}
            onSelect={u => {
              setMentionOpen(false);
              onSent(`@${u.name} `);
            }}
            className="bottom-20 left-3"
          />
        </div>
      </div>

      {/* Right panel — channel info + AI (or thread when active) */}
      {threadParent && (
        <div className="bg-bg-1 border-l border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[12px] font-semibold text-fg">{t('chat.thread')}</span>
            <IconButton size="sm" type="button" aria-label={t('common.close')} onClick={() => setOpenThreadId(null)}>
              <X size={13} />
            </IconButton>
          </div>
          <ThreadPanel
            channelId={active}
            parent={threadParent}
            replies={[]}
          />
        </div>
      )}
      {!threadParent && <div className="bg-bg-1 border-l border-border overflow-y-auto scroll p-4 space-y-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-2">고정된 메시지 (3)</div>
          <div className="rounded-md border border-border bg-bg-elev p-2.5 text-[11.5px] text-fg-1 leading-relaxed">
            <div className="font-semibold text-fg mb-0.5">📌 배포 가이드</div>
            <span className="text-fg-2">main 브랜치 머지 후 30분 이내 자동 배포...</span>
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-2">멤버 ({activeChannel?.members.length ?? 0})</div>
          <div className="space-y-1.5">
            {(activeChannel?.members ?? []).slice(0, 8).map(memberId => {
              const u = userMap.get(memberId);
              return (
                <div key={memberId} className="flex items-center gap-2 text-[12px]">
                  {u ? <Avatar user={u} size={20} /> : <span className="w-5 h-5 rounded-full bg-bg-2" />}
                  <span className="text-fg-1 flex-1 truncate">{u?.name ?? memberId}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                </div>
              );
            })}
          </div>
        </div>
      </div>}
    </div>
  );
}
