"use client";

import { useState } from "react";
import {
	Bell,
	Globe,
	Keyboard,
	Palette,
	Plug,
	Shield,
	Trash2,
	User,
} from "lucide-react";
import { AppearanceSection } from "./settings/appearance-section";
import { DangerSection } from "./settings/danger-section";
import { IntegrationsSection } from "./settings/integrations-section";
import { LanguageSection } from "./settings/language-section";
import { NotifSection } from "./settings/notif-section";
import { ProfileSection } from "./settings/profile-section";
import { SecuritySection } from "./settings/security-section";
import { ShortcutsSection } from "./settings/shortcuts-section";
import { AiGuideWidget } from "@/components/ai/ai-guide-widget";

const SECTIONS = [
	{ id: "profile", label: "프로필", icon: User },
	{ id: "notifications", label: "알림", icon: Bell },
	{ id: "security", label: "보안 / 세션", icon: Shield },
	{ id: "appearance", label: "외관", icon: Palette },
	{ id: "language", label: "언어 / 시간대", icon: Globe },
	{ id: "shortcuts", label: "단축키", icon: Keyboard },
	{ id: "integrations", label: "연결된 앱", icon: Plug },
	{ id: "danger", label: "계정 삭제", icon: Trash2 },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

export function SettingsPage() {
	const [active, setActive] = useState<SectionId>(() => {
		const hash =
			typeof window !== "undefined"
				? (window.location.hash.slice(1) as SectionId)
				: "profile";
		return SECTIONS.some((s) => s.id === hash) ? hash : "profile";
	});

	return (
		<div className="flex h-[calc(100vh-56px)]">
			<aside className="w-[240px] border-r border-border bg-bg-1 p-3 space-y-0.5">
				<div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-fg-3">
					개인 설정
				</div>
				{SECTIONS.map((s) => {
					const Icon = s.icon;
					const isActive = active === s.id;
					const isDanger = s.id === "danger";
					return (
						<button
							key={s.id}
							onClick={() => setActive(s.id)}
							className={`w-full flex items-center gap-2.5 px-2.5 h-9 rounded-md text-[12.5px] transition-colors ${
								isActive
									? "bg-accent-soft text-accent-strong font-semibold"
									: isDanger
										? "text-danger hover:bg-danger-soft"
										: "text-fg-1 hover:bg-hover"
							}`}
						>
							<Icon size={14} />
							<span>{s.label}</span>
						</button>
					);
				})}
			</aside>

			<div className="flex-1 overflow-y-auto scroll">
				<div className="max-w-[820px] mx-auto p-8">
					<AiGuideWidget
						systemContext={`설정 — ${SECTIONS.find(s => s.id === active)?.label ?? active} 섹션`}
						hints={[
							active === "security" ? "MFA 설정 방법 알려줘" : active === "notifications" ? "알림 설정 최적화해줘" : active === "integrations" ? "Notion 연동 설정 도와줘" : "설정 변경 가이드해줘",
							active === "profile" ? "프로필 완성도 높이는 방법" : "계정 보안 점검해줘",
							"자주 사용하는 설정 추천해줘",
						]}
						quickActions={[
							...(active !== "security" ? [{ label: '보안 설정', onClick: () => setActive("security") }] : []),
							...(active !== "notifications" ? [{ label: '알림 설정', onClick: () => setActive("notifications") }] : []),
							...(active !== "appearance" ? [{ label: '외관 설정', onClick: () => setActive("appearance") }] : []),
						]}
					/>
					{active === "profile" && <ProfileSection />}
					{active === "notifications" && <NotifSection />}
					{active === "security" && <SecuritySection />}
					{active === "appearance" && <AppearanceSection />}
					{active === "language" && <LanguageSection />}
					{active === "shortcuts" && <ShortcutsSection />}
					{active === "integrations" && <IntegrationsSection />}
					{active === "danger" && <DangerSection />}
				</div>
			</div>
		</div>
	);
}
