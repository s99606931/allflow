-- 4차 PDCA: server-side business-flow progress per user.
-- Composite PK (user_id, flow_id) — one row per user×flow.

CREATE TABLE "user_flow_progress" (
  "user_id"          TEXT NOT NULL,
  "flow_id"          VARCHAR(80) NOT NULL,
  "current_step_id"  VARCHAR(80) NOT NULL,
  "completed_steps"  TEXT[] NOT NULL DEFAULT '{}',
  "updated_at"       TIMESTAMP(3) NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_flow_progress_pkey" PRIMARY KEY ("user_id", "flow_id")
);

CREATE INDEX "user_flow_progress_user_id_idx" ON "user_flow_progress"("user_id");
