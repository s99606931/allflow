-- 6차 PDCA: user_flow_progress 에 step_started_at 컬럼 추가.
-- currentStepId 변경 시점만 추적하여 overdue 경고 기준으로 사용.
-- 기존 행에는 created_at 값을 기본값으로 채워 backfill (안전한 보수적 추정).

ALTER TABLE "user_flow_progress"
  ADD COLUMN "step_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 기존 행은 created_at 으로 backfill (해당 단계가 처음부터 시작됐다고 가정).
UPDATE "user_flow_progress"
SET "step_started_at" = "created_at"
WHERE "step_started_at" > "created_at";
