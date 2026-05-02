CREATE TABLE "client_activities" (
  "id" VARCHAR(30) NOT NULL,
  "client_id" VARCHAR(30) NOT NULL,
  "author_id" VARCHAR(30) NOT NULL,
  "kind" VARCHAR(20) NOT NULL,
  "text" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_activities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "client_activities_client_id_idx" ON "client_activities"("client_id");
ALTER TABLE "client_activities" ADD CONSTRAINT "client_activities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_activities" ADD CONSTRAINT "client_activities_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
