"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

const GROUPS = [
	{
		label: "탐색",
		items: [
			{ keys: ["⌘", "K"], desc: "명령 팔레트 열기" },
			{ keys: ["⌘", "/"], desc: "빠른 검색" },
			{ keys: ["⌘", "B"], desc: "사이드바 접기 / 펼치기" },
			{ keys: ["⌘", "I"], desc: "AI 어시스턴트 토글" },
		],
	},
	{
		label: "편집",
		items: [
			{ keys: ["⌘", "N"], desc: "새 항목 만들기" },
			{ keys: ["⌘", "S"], desc: "저장" },
			{ keys: ["⌘", "Z"], desc: "실행 취소" },
			{ keys: ["⌘", "⇧", "Z"], desc: "다시 실행" },
		],
	},
	{
		label: "보기",
		items: [
			{ keys: ["⌘", "1"], desc: "대시보드 이동" },
			{ keys: ["⌘", "2"], desc: "프로젝트 이동" },
			{ keys: ["⌘", "\\"], desc: "포커스 모드" },
			{ keys: ["Esc"], desc: "팝업 / 모달 닫기" },
		],
	},
];

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<>
			{/* Backdrop — proper <button> satisfies a11y keyboard requirement */}
			<button
				type="button"
				className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm cursor-default"
				onClick={onClose}
				aria-label="모달 닫기"
			/>
			{/* Dialog content — pointer-events-none on wrapper, auto on card */}
			<div className="fixed inset-0 z-[51] flex items-center justify-center pointer-events-none">
				<div className="pointer-events-auto bg-bg-1 border border-border rounded-xl shadow-2xl w-[480px] max-h-[80vh] overflow-y-auto">
					<div className="flex items-center justify-between px-5 py-4 border-b border-border">
						<span className="text-[14px] font-semibold text-fg">
							키보드 단축키
						</span>
						<button
							type="button"
							onClick={onClose}
							className="text-fg-3 hover:text-fg-1 p-1 rounded transition-colors"
							aria-label="닫기"
						>
							<X size={15} />
						</button>
					</div>

					<div className="p-5 space-y-5">
						{GROUPS.map((g) => (
							<div key={g.label}>
								<div className="text-[10.5px] uppercase tracking-wider font-semibold text-fg-3 mb-2">
									{g.label}
								</div>
								<div className="space-y-0.5">
									{g.items.map((item) => (
										<div
											key={item.desc}
											className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-bg-2"
										>
											<span className="text-[12.5px] text-fg-1">
												{item.desc}
											</span>
											<div className="flex items-center gap-0.5">
												{item.keys.map((k) => (
													<kbd
														key={k}
														className="px-1.5 py-0.5 rounded text-[10.5px] bg-bg-2 border border-border text-fg-2 font-mono leading-none"
													>
														{k}
													</kbd>
												))}
											</div>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</>
	);
}
