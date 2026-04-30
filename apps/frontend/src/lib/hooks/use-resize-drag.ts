import { useCallback, useState } from "react";

interface Options {
	minWidth: number;
	maxWidth: number;
	/** 'right': 오른쪽으로 드래그 → 넓어짐 (사이드바), 'left': 왼쪽으로 드래그 → 넓어짐 (AI 패널) */
	direction: "right" | "left";
	onResize: (width: number) => void;
}

export function useResizeDrag({
	minWidth,
	maxWidth,
	direction,
	onResize,
}: Options) {
	const [isResizing, setIsResizing] = useState(false);

	const startResize = useCallback(
		(e: React.MouseEvent, currentWidth: number) => {
			e.preventDefault();
			const startX = e.clientX;
			const startWidth = currentWidth;

			setIsResizing(true);
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";

			function handleMove(ev: MouseEvent) {
				const delta =
					direction === "right" ? ev.clientX - startX : startX - ev.clientX;
				onResize(Math.max(minWidth, Math.min(maxWidth, startWidth + delta)));
			}

			function handleUp() {
				setIsResizing(false);
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
				document.removeEventListener("mousemove", handleMove);
				document.removeEventListener("mouseup", handleUp);
			}

			document.addEventListener("mousemove", handleMove);
			document.addEventListener("mouseup", handleUp);
		},
		[minWidth, maxWidth, direction, onResize],
	);

	return { isResizing, startResize };
}
