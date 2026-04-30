"use client";

import { Avatar, Badge, Button } from "@/components/ui/primitives";
import { AiComposer } from "@/components/ai/ai-composer";
import { AiThreadSidebar } from "@/components/ai/ai-thread-sidebar";
import { MarkdownRenderer } from "@/components/ai/markdown-renderer";
import { ME } from "@/lib/fixtures";
import { useResizeDrag } from "@/lib/hooks/use-resize-drag";
import { useAiMutations, useAiStream, useLlmConnections } from "@/lib/hooks/use-data";
import type { AttachedFile } from "@/lib/hooks/use-file-attach";
import { cn } from "@/lib/utils";
import { AI_PANEL_MAX, AI_PANEL_MIN, useUIStore } from "@/store/ui-store";
import { FileText, Loader2, PanelLeft, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const SUGGEST = [
	"이번 주 회의록 요약해줘",
	"내가 담당한 P0 이슈 보여줘",
	"오늘 미팅 일정 정리",
	"대시보드 위젯 추가",
];

interface ChatMessage {
	id: string;
	role: "ai" | "user";
	text: string;
	chips?: string[];
	citations?: unknown[];
	toolCalls?: unknown[] | Record<string, unknown>;
	streaming?: boolean;
}

const STARTER: ChatMessage = {
	id: "starter",
	role: "ai",
	text: "안녕하세요 지우님, 무엇을 도와드릴까요?",
	chips: ["주간 리포트 생성", "회의록 정리", "태스크 검색"],
};

function Message({
	message,
	onChipClick,
}: {
	message: ChatMessage;
	onChipClick: (text: string) => void;
}) {
	if (message.role === "user") {
		return (
			<div className="flex gap-2.5 items-start justify-end">
				<div className="bg-accent-soft text-fg max-w-[80%] px-3 py-2 rounded-lg rounded-tr-sm text-[13px] whitespace-pre-wrap">
					{message.text}
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
				<MarkdownRenderer
					content={message.text}
					className="text-[13px] text-fg leading-relaxed"
				/>
				{message.toolCalls != null && (
					<ToolCallTrace toolCalls={message.toolCalls} />
				)}
				{message.chips && (
					<div className="flex flex-wrap gap-1.5">
						{message.chips.map((c) => (
							<Button
								key={c}
								variant="secondary"
								size="sm"
								onClick={() => onChipClick(c)}
							>
								{c}
							</Button>
						))}
					</div>
				)}
				{message.citations && message.citations.length > 0 && (
					<div className="flex items-center gap-2 text-[10.5px] text-fg-3">
						<Badge tone="accent" className="!h-4 !text-[10px]">
							AI
						</Badge>
						<FileText size={11} />
						<span>{message.citations.length}개 워크스페이스 문서 참조</span>
					</div>
				)}
			</div>
		</div>
	);
}

export function AIPanel() {
	const open = useUIStore((s) => s.aiPanelOpen);
	const close = useUIStore((s) => s.closeAIPanel);
	const aiPanelWidth = useUIStore((s) => s.aiPanelWidth);
	const setAIPanelWidth = useUIStore((s) => s.setAIPanelWidth);

	const [input, setInput] = useState("");
	const [msgs, setMsgs] = useState<ChatMessage[]>([STARTER]);
	const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const { complete } = useAiMutations();
	const { streamComplete, streaming } = useAiStream();
	const llmConnectionsQuery = useLlmConnections();
	const activeConn = llmConnectionsQuery.data?.find((c) => c.isActive);
	const scrollRef = useRef<HTMLDivElement>(null);

	const { isResizing, startResize } = useResizeDrag({
		minWidth: AI_PANEL_MIN,
		maxWidth: AI_PANEL_MAX,
		direction: "left",
		onResize: setAIPanelWidth,
	});

	const isPending = complete.isPending || streaming;

	const scrollToBottom = useCallback(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, []);

	useEffect(() => { scrollToBottom(); }, [scrollToBottom]);
	useEffect(() => { scrollToBottom(); }, [msgs.length, isPending, scrollToBottom]);

	const sendWithStream = useCallback(async (text: string, files: AttachedFile[]) => {
		if (!text.trim() && files.length === 0) return;
		if (isPending) return;

		const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
		const aiId = `a-${Date.now()}`;
		const aiMsg: ChatMessage = { id: aiId, role: "ai", text: "", streaming: true };
		setMsgs((prev) => [...prev, userMsg, aiMsg]);
		setInput("");

		await streamComplete(
			text,
			(delta) => {
				setMsgs((prev) =>
					prev.map((m) => (m.id === aiId ? { ...m, text: m.text + delta } : m)),
				);
			},
			(citations) => {
				setMsgs((prev) =>
					prev.map((m) => (m.id === aiId ? { ...m, streaming: false, citations } : m)),
				);
			},
		);
	}, [isPending, streamComplete]);

	const sendFallback = useCallback(async (text: string) => {
		const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
		setMsgs((prev) => [...prev, userMsg]);
		setInput("");
		try {
			const reply = await complete.mutateAsync(text);
			setMsgs((prev) => [...prev, { id: `a-${Date.now()}`, role: "ai", text: reply }]);
		} catch {
			setMsgs((prev) => [
				...prev,
				{ id: `e-${Date.now()}`, role: "ai", text: "응답을 가져오지 못했습니다. 관리자 콘솔에서 LLM 연결을 확인하세요." },
			]);
		}
	}, [complete]);

	const handleSend = useCallback((text: string, files: AttachedFile[]) => {
		const trimmed = text.trim();
		if (!trimmed && files.length === 0) return;
		if (activeConn) {
			void sendWithStream(trimmed, files);
		} else {
			void sendFallback(trimmed);
		}
	}, [activeConn, sendWithStream, sendFallback]);

	const handleSuggest = useCallback((s: string) => {
		handleSend(s, []);
	}, [handleSend]);

	const handleNewThread = useCallback(() => {
		setActiveThreadId(null);
		setMsgs([STARTER]);
	}, []);

	const modelLabel = activeConn
		? `${activeConn.kind} · ${activeConn.model}`
		: llmConnectionsQuery.isLoading
			? "LLM 로딩…"
			: "LLM 미설정";

	return (
		<aside
			className={cn(
				"relative shrink-0 bg-bg-elev border-l border-border shadow-[-4px_0_16px_rgba(0,0,0,.06)] overflow-hidden",
				isResizing && "select-none",
			)}
			style={{
				width: open ? aiPanelWidth : 0,
				transition: isResizing ? "none" : "width 300ms ease-in-out",
			}}
		>
			{open && (
				<div
					onMouseDown={(e) => startResize(e, aiPanelWidth)}
					className={cn(
						"absolute left-0 top-0 bottom-0 w-1 z-10 cursor-col-resize transition-colors",
						isResizing ? "bg-accent/50" : "hover:bg-accent/30",
					)}
					title="드래그하여 너비 조절"
				/>
			)}
			<div className="flex flex-col h-full min-h-0" style={{ width: aiPanelWidth }}>
				<Header
					modelLabel={modelLabel}
					hasMsgs={msgs.length > 1}
					sidebarOpen={sidebarOpen}
					onToggleSidebar={() => setSidebarOpen((v) => !v)}
					onReset={() => setMsgs([STARTER])}
					onClose={close}
				/>

				<div className="flex flex-1 min-h-0 overflow-hidden">
					{sidebarOpen && (
						<AiThreadSidebar
							activeThreadId={activeThreadId}
							onSelect={setActiveThreadId}
							onNew={handleNewThread}
						/>
					)}

					<div className="flex flex-col flex-1 min-h-0 min-w-0">
						<div ref={scrollRef} className="flex-1 overflow-y-auto scroll p-5 space-y-4 min-h-0">
							{msgs.map((m) => (
								<Message key={m.id} message={m} onChipClick={handleSuggest} />
							))}
							{isPending && !streaming && (
								<div className="flex gap-2.5 items-start">
									<div className="w-7 h-7 rounded-md bg-accent text-accent-fg grid place-items-center shrink-0">
										<Sparkles size={13} />
									</div>
									<div className="text-[13px] text-fg-3 flex items-center gap-2">
										<Loader2 size={12} className="animate-spin" />
										생각 중…
									</div>
								</div>
							)}
						</div>

						<div className="px-5 pb-3 pt-2 border-t border-border space-y-3 shrink-0">
							<div className="flex flex-wrap gap-1.5">
								{SUGGEST.map((s) => (
									<button
										type="button"
										key={s}
										onClick={() => handleSuggest(s)}
										disabled={isPending}
										className="text-[11.5px] px-2 py-1 rounded-md bg-bg-2 hover:bg-hover border border-border text-fg-1 transition-colors disabled:opacity-50"
									>
										{s}
									</button>
								))}
							</div>
							<AiComposer
								input={input}
								disabled={isPending}
								onChange={setInput}
								onSend={handleSend}
							/>
							<div className="text-[10.5px] text-fg-3 flex items-center justify-between">
								<span>Enter로 전송 · Shift+Enter 줄바꿈</span>
								<span>{activeConn ? "온라인" : "기본 응답 모드"}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</aside>
	);
}

function ToolCallTrace({ toolCalls }: { toolCalls: unknown[] | Record<string, unknown> }) {
	const count = Array.isArray(toolCalls) ? toolCalls.length : 1;
	return (
		<details className="mt-1 text-[11px] text-fg-3 border border-border rounded p-1.5">
			<summary className="cursor-pointer">도구 호출 {count}건</summary>
			<pre className="mt-1 whitespace-pre-wrap text-[10.5px] overflow-auto max-h-[120px]">
				{JSON.stringify(toolCalls, null, 2)}
			</pre>
		</details>
	);
}

function Header({
	modelLabel,
	hasMsgs,
	sidebarOpen,
	onToggleSidebar,
	onReset,
	onClose,
}: {
	modelLabel: string;
	hasMsgs: boolean;
	sidebarOpen: boolean;
	onToggleSidebar: () => void;
	onReset: () => void;
	onClose: () => void;
}) {
	return (
		<header className="h-14 px-5 border-b border-border flex items-center gap-2.5 shrink-0">
			<button
				type="button"
				className={cn("text-fg-3 hover:text-fg-1 p-1", sidebarOpen && "text-accent")}
				onClick={onToggleSidebar}
				aria-label="스레드 사이드바 토글"
				title="스레드 목록"
			>
				<PanelLeft size={15} />
			</button>
			<div className="w-8 h-8 rounded-md bg-accent-soft grid place-items-center text-accent-strong">
				<Sparkles size={15} />
			</div>
			<div className="flex-1 min-w-0">
				<div className="text-[13.5px] font-semibold text-fg">AI 어시스턴트</div>
				<div className="text-[11px] text-fg-3 truncate" title={modelLabel}>
					{modelLabel} · 워크스페이스 컨텍스트 활성
				</div>
			</div>
			{hasMsgs && (
				<button
					type="button"
					className="text-fg-3 hover:text-fg-1 p-1"
					onClick={onReset}
					aria-label="대화 초기화"
					title="대화 초기화"
				>
					<Trash2 size={14} />
				</button>
			)}
			<button
				type="button"
				className="text-fg-3 hover:text-fg-1 p-1"
				onClick={onClose}
				aria-label="닫기"
			>
				<X size={16} />
			</button>
		</header>
	);
}
