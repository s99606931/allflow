import { AIPanel } from "@/components/shell/ai-panel";
import { CommandPalette } from "@/components/shell/command-palette";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

export function AppShell({
	title,
	subtitle,
	actions,
	children,
}: {
	title: string;
	subtitle?: string;
	actions?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="flex h-screen overflow-hidden bg-bg">
			<Sidebar />
			<div className="flex-1 min-w-0 flex flex-col overflow-hidden">
				<Topbar title={title} subtitle={subtitle} actions={actions} />
				<main className="flex-1 min-w-0 overflow-auto">{children}</main>
			</div>
			<AIPanel />
			<CommandPalette />
		</div>
	);
}
