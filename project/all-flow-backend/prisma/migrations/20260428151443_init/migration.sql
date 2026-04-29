-- CreateEnum
CREATE TYPE "StatusKey" AS ENUM ('todo', 'doing', 'review', 'done', 'blocked');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('high', 'med', 'low');

-- CreateEnum
CREATE TYPE "IssueSev" AS ENUM ('critical', 'high', 'med', 'low');

-- CreateEnum
CREATE TYPE "IssuePrio" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('open', 'in-progress', 'in-review', 'resolved');

-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('weekly', 'monthly');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('mention', 'sla', 'ai', 'system', 'comment');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "CommentTargetKind" AS ENUM ('task', 'issue');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "dept" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusKey" NOT NULL DEFAULT 'doing',
    "due" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "StatusKey" NOT NULL DEFAULT 'todo',
    "due" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'med',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "project_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "proj_color" TEXT NOT NULL,
    "sev" "IssueSev" NOT NULL,
    "prio" "IssuePrio" NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'open',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sla" TEXT NOT NULL,
    "sla_pct" INTEGER NOT NULL DEFAULT 0,
    "linked" INTEGER NOT NULL DEFAULT 0,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "project_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "reporter_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "target_kind" "CommentTargetKind" NOT NULL,
    "task_id" TEXT,
    "issue_id" TEXT,
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "kind" "ReportKind" NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tldr" TEXT,
    "author_id" TEXT,
    "kpis" JSONB NOT NULL DEFAULT '[]',
    "sections" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "actor" TEXT,
    "href" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

-- CreateIndex
CREATE INDEX "tasks_project_id_status_idx" ON "tasks"("project_id", "status");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_idx" ON "tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "tasks_deleted_at_idx" ON "tasks"("deleted_at");

-- CreateIndex
CREATE INDEX "issues_project_id_status_idx" ON "issues"("project_id", "status");

-- CreateIndex
CREATE INDEX "issues_prio_idx" ON "issues"("prio");

-- CreateIndex
CREATE INDEX "issues_assignee_id_idx" ON "issues"("assignee_id");

-- CreateIndex
CREATE INDEX "issues_deleted_at_idx" ON "issues"("deleted_at");

-- CreateIndex
CREATE INDEX "comments_task_id_idx" ON "comments"("task_id");

-- CreateIndex
CREATE INDEX "comments_issue_id_idx" ON "comments"("issue_id");

-- CreateIndex
CREATE INDEX "comments_author_id_idx" ON "comments"("author_id");

-- CreateIndex
CREATE INDEX "reports_kind_period_start_idx" ON "reports"("kind", "period_start");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
