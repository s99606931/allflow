-- =====================================================================
-- T1: in-memory Map → Prisma 전환 (Approval / Client / Event / Resource / Booking)
-- =====================================================================

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('internal', 'google', 'outlook');

-- CreateEnum
CREATE TYPE "ResourceKind" AS ENUM ('room', 'equipment');

-- CreateTable: approvals
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "amount" DOUBLE PRECISION,
    "reason" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "approvals_status_created_at_idx" ON "approvals"("status", "created_at");
CREATE INDEX "approvals_approver_id_status_idx" ON "approvals"("approver_id", "status");
CREATE INDEX "approvals_requester_id_idx" ON "approvals"("requester_id");

-- CreateTable: clients
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "industry" TEXT,
    "owner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clients_owner_id_idx" ON "clients"("owner_id");
CREATE INDEX "clients_deleted_at_idx" ON "clients"("deleted_at");

-- CreateTable: events
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "attendees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resource_id" TEXT,
    "source" "EventSource" NOT NULL DEFAULT 'internal',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "events_start_idx" ON "events"("start");
CREATE INDEX "events_resource_id_idx" ON "events"("resource_id");

-- CreateTable: resources
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ResourceKind" NOT NULL,
    "capacity" INTEGER,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bookings
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "booked_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bookings_resource_id_start_idx" ON "bookings"("resource_id", "start");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
