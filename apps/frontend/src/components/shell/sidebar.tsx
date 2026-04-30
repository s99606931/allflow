"use client";

import { DocCreateDialog } from "@/components/dialogs/doc-create-dialog";
import { EventCreateDialog } from "@/components/dialogs/event-create-dialog";
import { IssueCreateDialog } from "@/components/dialogs/issue-create-dialog";
import { TaskCreateDialog } from "@/components/dialogs/task-create-dialog";
import {
	QuickCreateMenu,
	type QuickCreateKind,
} from "@/components/shell/quick-create-menu";
import { NAV } from "@/lib/fixtures";
import { useResizeDrag } from "@/lib/hooks/use-resize-drag";
import { cn } from "@/lib/utils";
import { SIDEBAR_MAX, SIDEBAR_MIN, useUIStore } from "@/store/ui-store";
import {
	AlertCircle,
	BadgeCheck,
	BarChart3,
	Bell,
	Building2,
	Calendar,
	CalendarRange,
	CheckSquare,
	ChevronsLeft,
	ChevronsRight,
	Database,
	FileBarChart,
	FileCheck2,
	FileText,
	FolderKanban,
	GanttChart,
	LayoutDashboard,
	type LucideIcon,
	MessageSquare,
	Network,
	Search,
	Settings,
	Shield,
	Sparkles,
	TrendingUp,
	Users,
} from "lucide-react";
import { useNavCounts } from "@/lib/hooks/use-data";
import type { NavCounts } from "@/lib/schemas";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ICONS: Record<string, LucideIcon> = {
	LayoutDashboard,
	FolderKanban,
	CheckSquare,
	AlertCircle,
	Calendar,
	FileText,
	MessageSquare,
	TrendingUp,
	Building2,
	Sparkles,
	Database,
	FileBarChart,
	BarChart3,
	Network,
	Users,
	Shield,
	Bell,
	FileCheck2,
	BadgeCheck,
	CalendarRange,
	Settings,
	GanttChart,
};

const NAV_COUNT_KEY: Partial<Record<string, keyof NavCounts>> = {
	projects: 'projects',
	tasks: 'tasks',
	issues: 'issues',
	approvals: 'approvals',
	clients: 'clients',
	notif: 'notifications',
};

export function Sidebar() {
	const pathname = usePathname();
	const collapsed = useUIStore((s) => s.sidebarCollapsed);
	const toggle = useUIStore((s) => s.toggleSidebar);
	const sidebarWidth = useUIStore((s) => s.sidebarWidth);
	const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
	const { data: navCounts } = useNavCounts();

	const { isResizing, startResize } = useResizeDrag({
		minWidth: SIDEBAR_MIN,
		maxWidth: SIDEBAR_MAX,
		direction: "right",
		onResize: setSidebarWidth,
	});

	// Quick create — shared by sidebar button + command palette `allflow:action`.
	const [openDialog, setOpenDialog] = useState<QuickCreateKind | null>(null);

	useEffect(() => {
		const onAction = (e: Event) => {
			const detail = (e as CustomEvent<string>).detail;
			if (detail === "new-task") setOpenDialog("task");
			else if (detail === "new-issue") setOpenDialog("issue");
			else if (detail === "new-doc") setOpenDialog("doc");
			else if (detail === "new-event") setOpenDialog("event");
		};
		window.addEventListener("allflow:action", onAction);
		return () => window.removeEventListener("allflow:action", onAction);
	}, []);

	return (
		<aside
			className={cn(
				"relative shrink-0 border-r border-border bg-bg-1 flex flex-col h-screen sticky top-0",
				isResizing && "select-none",
			)}
			style={{ width: collapsed ? 64 : sidebarWidth }}
		>
			{/* Workspace switcher — toggle always lives here, never outside the aside */}
			<div
				className={cn(
					"h-14 border-b border-border flex items-center shrink-0",
					collapsed ? "px-1.5 gap-1.5" : "px-3 gap-2.5",
				)}
			>
				<div className="w-8 h-8 rounded-md bg-accent text-accent-fg grid place-items-center font-bold text-[14px] shrink-0">
					오
				</div>
				{!collapsed && (
					<div className="flex-1 min-w-0">
						<div className="text-[13px] font-semibold text-fg truncate">
							오믈렛 워크스페이스
						</div>
						<div className="text-[11px] text-fg-3">123명 · Pro</div>
					</div>
				)}
				<button
					type="button"
					className={cn(
						"shrink-0 text-fg-3 hover:text-fg-1 transition-colors",
						!collapsed && "-mr-1",
					)}
					onClick={toggle}
					aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
				>
					{collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={16} />}
				</button>
			</div>

			{/* Search + new */}
			{!collapsed ? (
				<div className="p-3 space-y-2">
					<button
						type="button"
						onClick={() =>
							window.dispatchEvent(new CustomEvent("allflow:cmdk"))
						}
						className="w-full h-9 px-2.5 rounded-md bg-bg-2 hover:bg-hover border border-border text-[12.5px] text-fg-3 flex items-center gap-2 transition-colors"
					>
						<Search size={14} />
						<span className="flex-1 text-left">검색...</span>
						<kbd className="text-[10px] mono px-1.5 py-0.5 rounded bg-bg-elev border border-border text-fg-2">
							⌘K
						</kbd>
					</button>
					<QuickCreateMenu showLabel onSelect={(k) => setOpenDialog(k)} />
				</div>
			) : (
				<div className="px-1.5 py-3">
					<QuickCreateMenu showLabel={false} onSelect={(k) => setOpenDialog(k)} />
				</div>
			)}

			{/* Nav */}
			<nav className="flex-1 overflow-y-auto scroll px-2 pb-4">
				{NAV.map((sect) => (
					<div key={sect.sect} className="mb-1">
						{!collapsed && (
							<div className="px-2.5 pt-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-fg-3">
								{sect.sect}
							</div>
						)}
						{sect.items.map((it) => {
							const Icon = ICONS[it.icon] ?? LayoutDashboard;
							const active =
								pathname === it.href ||
								(it.href !== "/" && pathname.startsWith(it.href));
							return (
								<Link
									key={it.id}
									href={it.href}
									className={cn(
										"group flex items-center gap-2.5 mx-1 px-2 h-8 rounded-md text-[12.5px] transition-colors",
										active
											? "bg-accent-soft text-accent-strong font-semibold"
											: "text-fg-1 hover:bg-hover hover:text-fg",
										collapsed && "justify-center",
									)}
									title={collapsed ? it.label : undefined}
								>
									<Icon size={15} className="shrink-0" />
									{!collapsed && (
										<>
											<span className="flex-1 truncate">{it.label}</span>
											{(() => {
												const countKey = NAV_COUNT_KEY[it.id];
												const count = countKey ? (navCounts?.[countKey] ?? 0) : 0;
												return count > 0 ? (
													<span
														className={cn(
															"text-[10.5px] mono font-semibold px-1.5 rounded",
															active
																? "bg-accent text-accent-fg"
																: "bg-bg-2 text-fg-2",
														)}
													>
														{count}
													</span>
												) : null;
											})()}
										</>
									)}
								</Link>
							);
						})}
					</div>
				))}
			</nav>

			{/* 드래그 리사이즈 핸들 — 오른쪽 경계에 위치 */}
			{!collapsed && (
				<div
					onMouseDown={(e) => startResize(e, sidebarWidth)}
					className={cn(
						"absolute right-0 top-0 bottom-0 w-1 z-10 cursor-col-resize transition-colors",
						isResizing ? "bg-accent/50" : "hover:bg-accent/30",
					)}
					title="드래그하여 너비 조절"
				/>
			)}

			{/* Quick create dialogs — shared by 사이드바 + 명령 팔레트 */}
			<TaskCreateDialog
				open={openDialog === "task"}
				onOpenChange={(o) => setOpenDialog(o ? "task" : null)}
			/>
			<EventCreateDialog
				open={openDialog === "event"}
				onOpenChange={(o) => setOpenDialog(o ? "event" : null)}
			/>
			<DocCreateDialog
				open={openDialog === "doc"}
				onOpenChange={(o) => setOpenDialog(o ? "doc" : null)}
			/>
			<IssueCreateDialog
				open={openDialog === "issue"}
				onOpenChange={(o) => setOpenDialog(o ? "issue" : null)}
			/>
		</aside>
	);
}
