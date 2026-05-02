'use client';

import { useMemo, useState } from 'react';
import { Avatar, Button, IconButton } from '@/components/ui/primitives';
import { AtSign, Hash, Lock, Plus, Search, Sparkles, MessageSquare, Pin, X, Pencil, Trash2, Check } from 'lucide-react';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import { Composer } from '@/components/chat/composer';
import { ThreadPanel, type ThreadMessage } from '@/components/chat/thread-panel';
import { MentionPopover } from '@/components/chat/mention-popover';
import { useChannels, useMe, useTaskMutations, useUsers, useProjects, usePins, usePinMutations } from '@/lib/hooks/use-data';
import { toast } from 'sonner';
import { useChatMessages, useMessageMutations, useSendMessage } from '@/lib/hooks/use-chat-messages';
import type { PinnedMessageItem } from '@/lib/hooks/use-data';
import { useAiStream } from '@/lib/hooks/use-ai';
import { useTranslation } from '@/lib/i18n';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';

export function ChatPage() {
  const { t } = useTranslation();
  const userMap = useUserMap();
  const { data: users = [] } = useUsers();
  const { data: me } = useMe();
  const { data: channels = [], isLoading: channelsLoading, error: channelsError } = useChannels();
  const { data: projects = [] } = useProjects();
  const [activeId, setActiveId] = useState<string>('');
  const active = activeId || channels[0]?.id || '';
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [extractedDismissed, setExtractedDismissed] = useState(false);
  const [chatSummary, setChatSummary] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const { streaming: summarizing, streamComplete } = useAiStream();
  const taskMutations = useTaskMutations();
  const sendMessage = useSendMessage();

  const { data: messages = [] } = useChatMessages(active || null);
  const msgMutations = useMessageMutations(active);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const [channelSearch, setChannelSearch] = useState('');
  const [msgSearch, setMsgSearch] = useState('');
  const [msgSearchOpen, setMsgSearchOpen] = useState(false);
  const [pinsOpen, setPinsOpen] = useState(false);
  const { data: pins = [] } = usePins(active || null);
  const pinMutations = usePinMutations(active || null);
  const publicChannels = channels.filter(c => (c.kind === 'public' || c.kind === 'private') && (!channelSearch.trim() || c.name.toLowerCase().includes(channelSearch.toLowerCase())));
  const dmChannels = channels.filter(c => c.kind === 'dm' && (!channelSearch.trim() || c.name.toLowerCase().includes(channelSearch.toLowerCase())));
  const activeChannel = channels.find(c => c.id === active) ?? null;
  const topLevelMessages = useMemo(() => messages.filter(m => m.parentId === null), [messages]);
  const displayedMessages = useMemo(
    () => msgSearch.trim() ? topLevelMessages.filter(m => m.content.toLowerCase().includes(msgSearch.toLowerCase())) : topLevelMessages,
    [topLevelMessages, msgSearch],
  );

  const threadParent = useMemo<ThreadMessage | null>(() => {
    const found = messages.find(m => m.id === openThreadId);
    if (!found) return null;
    return {
      id: found.id,
      who: found.author?.id ?? '?',
      time: new Date(found.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      text: found.content,
    };
  }, [openThreadId, messages]);

  const threadReplies = useMemo<ThreadMessage[]>(() => {
    if (!openThreadId) return [];
    return messages
      .filter(m => m.parentId === openThreadId)
      .map(m => ({
        id: m.id,
        who: m.author?.id ?? '?',
        time: new Date(m.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
        text: m.content,
      }));
  }, [openThreadId, messages]);

  async function summarizeChat() {
    if (summarizing || messages.length === 0) return;
    setSummaryOpen(true);
    setChatSummary('');
    const excerpt = messages
      .slice(-20)
      .map(m => `${m.author?.name ?? '?'}: ${m.content}`)
      .join('\n');
    await streamComplete(
      `다음 채팅 대화를 한국어로 3~5문장으로 요약해주세요:\n\n${excerpt}`,
      (delta) => setChatSummary(prev => prev + delta),
      () => {},
    );
  }

  const onCreateTaskFromAI = async (text: string) => {
    const bullet = text.match(/•\s+"?([^"\n]+)"?/);
    const title = bullet ? bullet[1].trim() : '채팅에서 추출된 액션';
    await taskMutations.create.mutateAsync({
      title,
      projectId: projects[0]?.id ?? '',
      assigneeId: me?.id ?? '',
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
            <input
              value={channelSearch}
              onChange={e => setChannelSearch(e.target.value)}
              placeholder="채널/사람 검색..."
              className="w-full h-8 pl-8 pr-3 rounded-md bg-bg-2 border border-border text-[12px] focus:outline-none focus:border-accent"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scroll p-2">
          <div className="px-2 pt-2 pb-1 flex items-center justify-between">
            <span className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold">채널</span>
            <button type="button" aria-label="채널 추가" onClick={() => toast.info('채널 생성은 관리자 설정에서 가능합니다.')} className="text-fg-3 hover:text-fg-1"><Plus size={12} /></button>
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
                <button type="button" aria-label="DM 추가" onClick={() => toast.info('DM 시작은 조직도에서 사용자를 선택하세요.')} className="text-fg-3 hover:text-fg-1"><Plus size={12} /></button>
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
          <IconButton size="sm" onClick={() => setPinsOpen(v => !v)} aria-pressed={pinsOpen} aria-label="고정 메시지"><Pin size={13} /></IconButton>
          {msgSearchOpen && (
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-3 pointer-events-none" />
              <input
                autoFocus
                value={msgSearch}
                onChange={e => setMsgSearch(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && (setMsgSearchOpen(false), setMsgSearch(''))}
                placeholder="메시지 검색..."
                className="h-7 w-44 pl-6 pr-2 rounded-md bg-bg-2 border border-border text-[12px] focus:outline-none focus:border-accent"
              />
            </div>
          )}
          <IconButton size="sm" onClick={() => { setMsgSearchOpen(v => !v); if (msgSearchOpen) setMsgSearch(''); }}><Search size={13} /></IconButton>
          <IconButton
            size="sm"
            aria-pressed={msgSearch === '@'}
            aria-label="멘션 필터"
            onClick={() => setMsgSearch(prev => prev === '@' ? '' : '@')}
            className={msgSearch === '@' ? 'text-accent-strong bg-accent-soft' : ''}
          ><AtSign size={13} /></IconButton>
          <Button variant={summaryOpen ? 'primary' : 'secondary'} size="sm" onClick={summarizeChat} disabled={summarizing || messages.length === 0}>
            <Sparkles size={12} /> {summarizing ? '요약 중...' : '대화 요약'}
          </Button>
        </header>

        {pinsOpen && (
          <div className="mx-4 mt-3 p-3 rounded-lg border border-border bg-bg-elev">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-fg-1"><Pin size={12} /> 고정 메시지 ({pins.length})</div>
              <IconButton size="sm" onClick={() => setPinsOpen(false)}><X size={12} /></IconButton>
            </div>
            {pins.length === 0 && <div className="text-[11.5px] text-fg-3">고정된 메시지가 없습니다.</div>}
            {pins.map(p => (
              <div key={p.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                <div className="flex-1 text-[12px] text-fg truncate">{p.message.content}</div>
                <div className="text-[10.5px] text-fg-3 shrink-0">{p.message.author.name}</div>
                <IconButton size="sm" onClick={() => pinMutations.unpin.mutate(p.messageId)} disabled={pinMutations.unpin.isPending}><X size={11} /></IconButton>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 pt-2">
          <AiGuideWidget
            systemContext={`팀 채팅 — ${channels.length}개 채널, 현재 채널 ${messages.length}건 메시지`}
            hints={[
              messages.length > 20 ? `${messages.length}건 대화 핵심 요약해줘` : activeChannel ? `#${activeChannel.name} 채널 대화 요약해줘` : '대화 요약해줘',
              pins.length > 0 ? `고정 메시지 ${pins.length}건 정리해줘` : '액션 아이템 추출해줘',
              '중요 결정 사항 찾아줘',
            ]}
          />
        </div>
        {summaryOpen && chatSummary && (
          <div className="mx-4 mt-3 p-3 rounded-lg border border-accent/20 bg-accent-soft text-[12.5px] text-fg-1 leading-relaxed flex gap-2">
            <Sparkles size={13} className="text-accent-strong shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[11px] font-semibold text-accent-strong mb-1">대화 요약</div>
              {chatSummary}
              {summarizing && <span className="inline-block w-1.5 h-3.5 bg-accent-strong ml-0.5 animate-pulse" />}
            </div>
            <button onClick={() => { setSummaryOpen(false); setChatSummary(''); }} className="text-fg-3 hover:text-fg shrink-0"><X size={12} /></button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto scroll p-5 space-y-4">
          {msgSearch.trim() && (
            <div className="text-[11.5px] text-fg-3 pb-1">"{msgSearch}" 검색 결과 {displayedMessages.length}건</div>
          )}
          {displayedMessages.map(m => {
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
            const isEditing = editingMsgId === m.id;
            return (
              <div key={m.id} className={`group flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                <Avatar user={displayUser} size={32} />
                <div className={`flex-1 min-w-0 ${mine ? 'text-right' : ''}`}>
                  <div className={`flex items-baseline gap-2 ${mine ? 'justify-end' : ''}`}>
                    <span className="text-[12.5px] font-semibold text-fg">{displayUser.name}</span>
                    <span className="text-[10.5px] text-fg-3">{msgTime}</span>
                    {!isEditing && (
                      <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          type="button"
                          onClick={() => pinMutations.pin.mutate(m.id)}
                          className="text-fg-3 hover:text-fg-1"
                          aria-label="메시지 고정"
                          disabled={pinMutations.pin.isPending}
                        ><Pin size={11} /></button>
                        {mine && <>
                          <button
                            type="button"
                            onClick={() => { setEditingMsgId(m.id); setEditingText(m.content); }}
                            className="text-fg-3 hover:text-fg-1"
                            aria-label="메시지 수정"
                          ><Pencil size={11} /></button>
                          <button
                            type="button"
                            onClick={() => msgMutations.remove.mutate(m.id)}
                            className="text-fg-3 hover:text-danger"
                            aria-label="메시지 삭제"
                          ><Trash2 size={11} /></button>
                        </>}
                      </span>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        autoFocus
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            msgMutations.update.mutate({ msgId: m.id, text: editingText }, { onSuccess: () => setEditingMsgId(null) });
                          }
                          if (e.key === 'Escape') setEditingMsgId(null);
                        }}
                        className="flex-1 rounded-md border border-accent px-2 py-1 text-[13px] bg-bg-2 text-fg focus:outline-none"
                        maxLength={4000}
                      />
                      <button type="button" onClick={() => msgMutations.update.mutate({ msgId: m.id, text: editingText }, { onSuccess: () => setEditingMsgId(null) })} className="text-success hover:text-success-strong"><Check size={13} /></button>
                      <button type="button" onClick={() => setEditingMsgId(null)} className="text-fg-3 hover:text-fg"><X size={13} /></button>
                    </div>
                  ) : (
                    <div className={`inline-block rounded-lg px-3 py-2 text-[13px] leading-relaxed mt-1 max-w-[600px] text-left ${
                      mine ? 'bg-accent-soft text-fg' : 'bg-bg-1 border border-border text-fg-1'
                    }`}>
                      {m.content}
                    </div>
                  )}
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
            users={users}
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
            replies={threadReplies}
          />
        </div>
      )}
      {!threadParent && <div className="bg-bg-1 border-l border-border overflow-y-auto scroll p-4 space-y-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-2">고정된 메시지 ({pins.length})</div>
          {pins.length === 0 && <div className="text-[11.5px] text-fg-3">고정된 메시지가 없습니다.</div>}
          <div className="space-y-2">
            {pins.map((p: PinnedMessageItem) => (
              <div key={p.id} className="rounded-md border border-border bg-bg-elev p-2.5 text-[11.5px] text-fg-1 leading-relaxed">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Pin size={10} className="text-accent shrink-0" />
                  <span className="font-semibold text-fg truncate">{p.message.author.name}</span>
                  <span className="text-[10px] text-fg-3 ml-auto shrink-0">{new Date(p.message.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                </div>
                <span className="text-fg-2 line-clamp-2">{p.message.content}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          {(() => {
            const participants = Array.from(new Map(messages.map(m => [m.author.id, m.author])).values()).slice(0, 8);
            return (
              <>
                <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-2">참여자 ({participants.length})</div>
                <div className="space-y-1.5">
                  {participants.map(author => {
                    const u = userMap.get(author.id);
                    return (
                      <div key={author.id} className="flex items-center gap-2 text-[12px]">
                        {u ? <Avatar user={u} size={20} /> : <span className="w-5 h-5 rounded-full bg-bg-2 grid place-items-center text-[9px] font-bold text-fg-2">{author.initials}</span>}
                        <span className="text-fg-1 flex-1 truncate">{u?.name ?? author.name}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                      </div>
                    );
                  })}
                  {participants.length === 0 && <div className="text-[11.5px] text-fg-3">아직 메시지가 없습니다.</div>}
                </div>
              </>
            );
          })()}
        </div>
      </div>}
    </div>
  );
}
