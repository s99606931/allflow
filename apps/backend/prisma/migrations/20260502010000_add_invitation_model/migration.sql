-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "org_unit_id" VARCHAR(80) NOT NULL,
    "role" VARCHAR(80) NOT NULL,
    "invited_by" TEXT NOT NULL,
    "pending" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateUnique Index
CREATE UNIQUE INDEX "invitations_email_org_unit_id_key" ON "invitations"("email", "org_unit_id");
