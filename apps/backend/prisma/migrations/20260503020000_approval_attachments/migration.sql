-- Add attachments column to approvals table
ALTER TABLE "approvals" ADD COLUMN "attachments" TEXT[] NOT NULL DEFAULT '{}';
