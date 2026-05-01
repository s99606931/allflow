"use client";

import { Card, CardBody } from "@/components/ui/primitives";
import { type Locale, useTranslation } from "@/lib/i18n";
import { Row, Section } from "./shared";

export function LanguageSection() {
	const { locale, setLocale, t } = useTranslation();
	return (
		<Section title="언어 / 시간대">
			<Card>
				<CardBody className="space-y-1">
					<Row label={t("settings.locale")}>
						<select
							aria-label={t("settings.locale")}
							value={locale}
							onChange={(e) => setLocale(e.target.value as Locale)}
							className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px]"
						>
							<option value="ko">{t("settings.locale.ko")}</option>
							<option value="en">{t("settings.locale.en")}</option>
						</select>
					</Row>
					<Row label="시간대">
						<select className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px]">
							<option>(UTC+09:00) 서울</option>
							<option>(UTC+00:00) 런던</option>
							<option>(UTC-08:00) 샌프란시스코</option>
						</select>
					</Row>
					<Row label="날짜 형식">
						<select className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px]">
							<option>2026년 4월 28일</option>
							<option>2026-04-28</option>
							<option>04/28/2026</option>
						</select>
					</Row>
					<Row label="주 시작 요일">
						<select className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px]">
							<option>월요일</option>
							<option>일요일</option>
						</select>
					</Row>
				</CardBody>
			</Card>
		</Section>
	);
}
