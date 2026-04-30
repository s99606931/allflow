-- Gantt Phase 1 — Task fields + TaskDependency model
-- See: docs/02-design/features/gantt-chart-2026-04-30.prd.md §F1

-- CreateEnum
CREATE TYPE "TaskKind" AS ENUM ('task', 'milestone', 'summary');

-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('FS', 'SS', 'FF', 'SF');

-- AlterTable
ALTER TABLE "tasks"
    ADD COLUMN "start_date"     DATE,
    ADD COLUMN "end_date"       DATE,
    ADD COLUMN "parent_task_id" TEXT,
    ADD COLUMN "kind"           "TaskKind" NOT NULL DEFAULT 'task',
    ADD COLUMN "progress"       INTEGER    NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_parent_task_id_fkey"
        FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "tasks_start_date_end_date_idx" ON "tasks"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "tasks_parent_task_id_idx" ON "tasks"("parent_task_id");

-- CreateTable
CREATE TABLE "task_dependencies" (
    "id"             TEXT NOT NULL,
    "predecessor_id" TEXT NOT NULL,
    "successor_id"   TEXT NOT NULL,
    "type"           "DependencyType" NOT NULL DEFAULT 'FS',
    "lag_days"       INTEGER NOT NULL DEFAULT 0,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_predecessor_id_successor_id_key"
    ON "task_dependencies"("predecessor_id", "successor_id");

-- CreateIndex
CREATE INDEX "task_dependencies_predecessor_id_idx"
    ON "task_dependencies"("predecessor_id");

-- CreateIndex
CREATE INDEX "task_dependencies_successor_id_idx"
    ON "task_dependencies"("successor_id");

-- AddForeignKey
ALTER TABLE "task_dependencies"
    ADD CONSTRAINT "task_dependencies_predecessor_id_fkey"
        FOREIGN KEY ("predecessor_id") REFERENCES "tasks"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies"
    ADD CONSTRAINT "task_dependencies_successor_id_fkey"
        FOREIGN KEY ("successor_id") REFERENCES "tasks"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
