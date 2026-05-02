"use client";

import {
	Avatar,
	Button,
	Card,
	CardBody,
} from "@/components/ui/primitives";
import { useMe, useProfileMutations } from "@/lib/hooks/use-data";
import { Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Row, Section } from "./shared";

export function ProfileSection() {
	const { data: me, isLoading } = useMe();
	const { update } = useProfileMutations();

	const [name, setName] = useState("");
	const [role, setRole] = useState("");
	const [dept, setDept] = useState("");
	const [bio, setBio] = useState("");
	const [userStatus, setUserStatus] = useState("업무 중");

	/* eslint-disable react-hooks/set-state-in-effect */
	useEffect(() => {
		if (me) {
			setName(me.name);
			setRole(me.role);
			setDept(me.dept);
			setBio((me as { bio?: string }).bio ?? "");
			setUserStatus((me as { userStatus?: string }).userStatus ?? "업무 중");
		}
	}, [me]);
	/* eslint-enable react-hooks/set-state-in-effect */

	const onSave = () => {
		update.mutate({ name, role, dept, bio: bio || undefined, userStatus });
	};

	const onReset = () => {
		if (me) {
			setName(me.name);
			setRole(me.role);
			setDept(me.dept);
			setBio((me as { bio?: string }).bio ?? "");
			setUserStatus((me as { userStatus?: string }).userStatus ?? "업무 중");
		}
	};

	return (
		<Section title="프로필" desc="동료들이 보는 프로필 정보입니다.">
			<Card>
				<CardBody className="space-y-1">
					<div className="flex items-center gap-4 pb-4">
						<div className="relative">
							{me && <Avatar user={me} size={72} />}
							<button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-accent-fg grid place-items-center ring-2 ring-bg-elev">
								<Camera size={12} />
							</button>
						</div>
						<div>
							<div className="text-[18px] font-bold text-fg">
								{me?.name ?? "—"}
							</div>
							<div className="text-[12px] text-fg-2">
								{me?.role ?? "—"} · {me?.dept ?? "—"}
							</div>
							{isLoading && (
								<div className="text-[11px] text-fg-3 mt-1">불러오는 중...</div>
							)}
							<Button size="sm" variant="secondary" className="mt-2" onClick={() => toast.info("프로필 사진 변경 기능은 준비 중입니다.")}>
								사진 변경
							</Button>
						</div>
					</div>

					<Row label="표시 이름" sub="회의 · 채팅 · 댓글에 사용됩니다.">
						<input
							className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px] w-44"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</Row>
					<Row label="이메일">
						<span className="text-[12px] text-fg-2 mono">
							{me?.email ?? "—"}
						</span>
					</Row>
					<Row label="직무 / 직책">
						<input
							className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px] w-44"
							value={role}
							onChange={(e) => setRole(e.target.value)}
						/>
					</Row>
					<Row label="부서">
						<input
							className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px] w-44"
							value={dept}
							onChange={(e) => setDept(e.target.value)}
						/>
					</Row>
					<Row label="자기소개" sub="동료가 프로필에서 볼 수 있는 한 줄 소개">
						<input
							className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px] w-72"
							placeholder="간결한 한 줄 소개"
							value={bio}
							onChange={(e) => setBio(e.target.value)}
							maxLength={200}
						/>
					</Row>
					<Row label="현재 상태">
						<select
							className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px]"
							value={userStatus}
							onChange={(e) => setUserStatus(e.target.value)}
						>
							<option value="업무 중">업무 중 🟢</option>
							<option value="집중 모드">집중 모드 🔵</option>
							<option value="회의 중">회의 중 🔴</option>
							<option value="자리비움">자리비움 🟡</option>
						</select>
					</Row>
				</CardBody>
			</Card>

			<div className="flex justify-end gap-2">
				<Button
					variant="secondary"
					onClick={onReset}
					disabled={update.isPending}
				>
					취소
				</Button>
				<Button variant="primary" onClick={onSave} disabled={update.isPending}>
					{update.isPending ? "저장 중..." : "저장"}
				</Button>
			</div>
		</Section>
	);
}
