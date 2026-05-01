"use client";

export function Section({
	title,
	desc,
	children,
}: { title: string; desc?: string; children: React.ReactNode }) {
	return (
		<div className="space-y-5">
			<div>
				<h2 className="text-[18px] font-bold text-fg">{title}</h2>
				{desc && <p className="text-[12.5px] text-fg-3 mt-1">{desc}</p>}
			</div>
			{children}
		</div>
	);
}

export function Row({
	label,
	sub,
	children,
}: { label: string; sub?: string; children?: React.ReactNode }) {
	return (
		<div className="flex items-start gap-4 py-3 border-b border-border last:border-0">
			<div className="flex-1 min-w-0">
				<div className="text-[12.5px] font-medium text-fg">{label}</div>
				{sub && (
					<div className="text-[11.5px] text-fg-3 mt-0.5 leading-relaxed">
						{sub}
					</div>
				)}
			</div>
			<div className="shrink-0 flex items-center gap-2">{children}</div>
		</div>
	);
}

export function Toggle({
	checked,
	onChange,
}: { checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<button
			onClick={() => onChange(!checked)}
			className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-accent" : "bg-bg-2 border border-border"}`}
			aria-pressed={checked}
		>
			<span
				className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`}
			/>
		</button>
	);
}
