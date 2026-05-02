"use client";

import { Button, Card, CardBody } from "@/components/ui/primitives";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Section } from "./shared";

export function DangerSection() {
	return (
		<Section title="계정 삭제" desc="이 작업은 되돌릴 수 없습니다.">
			<Card className="border-danger/40">
				<CardBody className="space-y-3">
					<div className="text-[13px] text-fg-1 leading-relaxed">
						계정을 삭제하면 다음 데이터가 영구적으로 제거됩니다:
						<ul className="list-disc ml-5 mt-2 space-y-1 text-fg-2 text-[12px]">
							<li>프로필 · 설정 · 단축키 · 알림 환경설정</li>
							<li>업로드한 파일 · 첨부 · 댓글</li>
							<li>1:1 미팅 노트 · 평가 셀프 작성분</li>
						</ul>
						<div className="text-fg-3 text-[11.5px] mt-2">
							※ 워크스페이스 공통 데이터(프로젝트·태스크·이슈)는 익명 처리되어
							보존됩니다.
						</div>
					</div>
					<div className="flex justify-end gap-2 pt-2 border-t border-border">
						<Button size="md" variant="danger" onClick={() => {
							const confirmed = window.confirm("정말로 계정을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
							if (confirmed) {
								toast.error("계정 삭제 기능은 준비 중입니다. 관리자에게 문의해 주세요.");
							}
						}}>
							<Trash2 size={13} /> 계정 영구 삭제
						</Button>
					</div>
				</CardBody>
			</Card>
		</Section>
	);
}
