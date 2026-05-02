"use client";

import { Avatar, IconButton } from "@/components/ui/primitives";
import { useMe, useNotifications } from "@/lib/hooks/use-data";

const ANON_USER = {
	id: "anon",
	name: "...",
	role: "",
	dept: "",
	initials: "?",
	color: "#888888",
};
import { useRealtime } from "@/lib/realtime";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import {
	Bell,
	BookOpen,
	HelpCircle,
	Info,
	LogOut,
	MessageSquare,
	Settings,
	Sparkles,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";


// ── 단축키 목록 ─────────────────────────────────────────────────────────────

const SHORTCUTS = [
	{ keys: ["⌘", "K"], label: "명령 팔레트" },
	{ keys: ["⌘", "/"], label: "빠른 검색" },
	{ keys: ["⌘", "B"], label: "사이드바 토글" },
	{ keys: ["⌘", "I"], label: "AI 어시스턴트" },
];

// ── Topbar ──────────────────────────────────────────────────────────────────

export function Topbar({
	title,
	subtitle,
	actions,
}: { title: string; subtitle?: string; actions?: React.ReactNode }) {
	const toggleAI = useUIStore((s) => s.toggleAIPanel);
	const { status: rtStatus } = useRealtime();
	const meQuery = useMe();
	const me = meQuery.data ?? ANON_USER;

	const rtColor =
		rtStatus === "open"
			? "bg-success"
			: rtStatus === "connecting"
				? "bg-warning animate-pulse"
				: "bg-fg-3";
	const rtLabel =
		rtStatus === "open"
			? "실시간 연결됨"
			: rtStatus === "connecting"
				? "연결 중..."
				: "오프라인";

	return (
		<header className="h-14 sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-border flex items-center px-6 gap-4">
			<div className="flex-1 min-w-0">
				<div className="flex items-baseline gap-2">
					<h1 className="text-[15px] font-semibold text-fg truncate tracking-tight">
						{title}
					</h1>
					{subtitle && (
						<span className="text-[12px] text-fg-3 truncate">· {subtitle}</span>
					)}
				</div>
			</div>

			{actions}

			<div
				className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full bg-bg-1 border border-border"
				title={rtLabel}
			>
				<span className={`w-1.5 h-1.5 rounded-full ${rtColor}`} />
				<span className="text-[10px] text-fg-3 tabular-nums">{rtLabel}</span>
			</div>

			<div className="flex items-center gap-1">
				<IconButton
					size="sm"
					aria-label="AI 어시스턴트"
					onClick={toggleAI}
					className="text-accent-strong hover:bg-accent-soft"
				>
					<Sparkles size={15} />
				</IconButton>
				<NotificationMenu />
				<HelpMenu />
				<div className="ml-1.5">
					<UserMenu user={me} />
				</div>
			</div>
		</header>
	);
}

// ── 알림 메뉴 ───────────────────────────────────────────────────────────────

function NotificationMenu() {
	const [open, setOpen] = useState(false);
	const [readIds, setReadIds] = useState<Set<string>>(new Set());
	const { data: rawItems = [] } = useNotifications();
	const items = rawItems.map(n => ({ ...n, read: n.read || readIds.has(n.id) }));
	const ref = useRef<HTMLDivElement>(null);
	const unread = items.filter((n) => !n.read).length;

	useEffect(() => {
		if (!open) return;
		function onDoc(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node))
				setOpen(false);
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}
		document.addEventListener("mousedown", onDoc);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDoc);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	return (
		<div className="relative" ref={ref}>
			<IconButton
				size="sm"
				aria-label={`알림${unread > 0 ? ` (${unread}개 미읽음)` : ""}`}
				onClick={() => setOpen((o) => !o)}
				className="relative"
			>
				<Bell size={15} />
				{unread > 0 && (
					<span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-danger" />
				)}
			</IconButton>

			{open && (
				<div
					aria-label="알림 패널"
					className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-bg-1 shadow-lg z-30 overflow-hidden text-[13px]"
				>
					<div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
						<div className="flex items-center gap-1.5">
							<span className="font-semibold text-fg">알림</span>
							{unread > 0 && (
								<span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-danger text-white font-medium leading-none">
									{unread}
								</span>
							)}
						</div>
						{unread > 0 && (
							<button
								type="button"
								onClick={() => setReadIds(new Set(items.map(n => n.id)))}
								className="text-[11px] text-accent hover:text-accent-strong transition-colors"
							>
								모두 읽음
							</button>
						)}
					</div>

					<div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
						{items.map((n) => (
							<button
								type="button"
								key={n.id}
								onClick={() => setReadIds(prev => new Set([...prev, n.id]))}
								className={cn(
									"w-full text-left px-3 py-2.5 hover:bg-bg-2 flex items-start gap-2.5 transition-colors",
									!n.read && "bg-accent-soft/20",
								)}
							>
								<span
									className={cn(
										"mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
										!n.read ? "bg-accent" : "bg-transparent",
									)}
								/>
								<div className="flex-1 min-w-0">
									<div
										className={cn(
											"text-[12.5px]",
											!n.read ? "font-semibold text-fg" : "text-fg-1",
										)}
									>
										{n.title}
									</div>
									<div className="text-[11.5px] text-fg-2 leading-snug mt-0.5 line-clamp-2">
										{n.body}
									</div>
									<div className="text-[10.5px] text-fg-3 mt-1">{n.time}</div>
								</div>
							</button>
						))}
					</div>

					<div className="px-3 py-2 border-t border-border text-center">
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="text-[11.5px] text-accent hover:text-accent-strong transition-colors"
						>
							모든 알림 보기
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

// ── 도움말 메뉴 ─────────────────────────────────────────────────────────────

function HelpMenu() {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const router = useRouter();

	useEffect(() => {
		if (!open) return;
		function onDoc(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node))
				setOpen(false);
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}
		document.addEventListener("mousedown", onDoc);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDoc);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	return (
		<div className="relative" ref={ref}>
			<IconButton
				size="sm"
				aria-label="도움말"
				onClick={() => setOpen((o) => !o)}
			>
				<HelpCircle size={15} />
			</IconButton>

			{open && (
				<div
					aria-label="도움말 패널"
					className="absolute right-0 mt-2 w-60 rounded-lg border border-border bg-bg-1 shadow-lg z-30 py-1 text-[13px]"
				>
					<div className="px-3 py-1.5 text-[10.5px] font-semibold text-fg-3 uppercase tracking-wider">
						키보드 단축키
					</div>
					{SHORTCUTS.map(({ keys, label }) => (
						<div
							key={label}
							className="flex items-center justify-between px-3 py-1.5 hover:bg-bg-2"
						>
							<span className="text-[12.5px] text-fg-1">{label}</span>
							<div className="flex items-center gap-0.5">
								{keys.map((k) => (
									<kbd
										key={k}
										className="px-1.5 py-0.5 rounded text-[10px] bg-bg-2 border border-border text-fg-2 font-mono leading-none"
									>
										{k}
									</kbd>
								))}
							</div>
						</div>
					))}

					<div className="border-t border-border mt-1 pt-1">
						<div className="px-3 py-1.5 text-[10.5px] font-semibold text-fg-3 uppercase tracking-wider">
							리소스
						</div>
						<button
							type="button"
							onClick={() => {
								setOpen(false);
								router.push("/docs");
							}}
							className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-bg-2 text-left transition-colors"
						>
							<BookOpen size={13} className="text-fg-3" />
							<span className="text-[12.5px] text-fg-1">문서 보기</span>
						</button>
						<button
							type="button"
							onClick={() => {
								setOpen(false);
								window.open("mailto:support@allflow.app", "_blank");
							}}
							className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-bg-2 text-left transition-colors"
						>
							<MessageSquare size={13} className="text-fg-3" />
							<span className="text-[12.5px] text-fg-1">피드백 보내기</span>
						</button>
						<div className="flex items-center gap-2.5 px-3 py-2 text-fg-3">
							<Info size={13} />
							<span className="text-[11px]">AllFlow v1.0.0</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// ── 사용자 메뉴 ─────────────────────────────────────────────────────────────

interface UserMenuUser {
	id: string;
	name: string;
	role: string;
	dept: string;
	initials: string;
	color: string;
	email?: string;
}

function UserMenu({ user }: { user: UserMenuUser }) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const router = useRouter();

	useEffect(() => {
		if (!open) return;
		function onDoc(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node))
				setOpen(false);
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}
		document.addEventListener("mousedown", onDoc);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDoc);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	return (
		<div className="relative" ref={ref}>
			<button
				type="button"
				aria-label="사용자 메뉴"
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
				className="rounded-full focus:outline-none focus:ring-2 focus:ring-accent"
			>
				<Avatar user={user} size={28} />
			</button>

			{open && (
				<div
					role="menu"
					className="absolute right-0 mt-2 w-64 rounded-lg border border-border bg-bg-1 shadow-lg z-30 py-1 text-[13px]"
				>
					{/* 헤더 */}
					<div className="px-4 py-3 border-b border-border flex items-center gap-3">
						<Avatar user={user} size={40} />
						<div className="min-w-0 flex-1">
							<div className="font-semibold text-fg truncate">{user.name}</div>
							<div className="text-fg-3 text-[11.5px] truncate">
								{user.role} · {user.dept}
							</div>
							{user.email && (
								<div className="text-fg-3 text-[11px] truncate mt-0.5">
									{user.email}
								</div>
							)}
						</div>
					</div>

					{/* 계정 액션 */}
					<div className="py-1">
						<MenuButton
							icon={<Settings size={14} />}
							label="계정 설정"
							onClick={() => {
								setOpen(false);
								router.push("/settings");
							}}
						/>
					</div>

					<div className="border-t border-border py-1">
						<MenuButton
							icon={<LogOut size={14} />}
							label="로그아웃"
							variant="danger"
							onClick={() => signOut({ callbackUrl: "/login" })}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

function MenuButton({
	icon,
	label,
	onClick,
	variant,
}: {
	icon: React.ReactNode;
	label: string;
	onClick?: () => void;
	variant?: "danger";
}) {
	return (
		<button
			type="button"
			role="menuitem"
			className={cn(
				"w-full flex items-center gap-2 px-3 py-1.5 hover:bg-bg-2 text-left transition-colors",
				variant === "danger" ? "text-danger" : "text-fg-1",
			)}
			onClick={onClick}
		>
			<span className={variant === "danger" ? "text-danger" : "text-fg-3"}>
				{icon}
			</span>
			{label}
		</button>
	);
}
