-- CreateEnum
CREATE TYPE "LlmKind" AS ENUM ('lmstudio', 'ollama', 'openai', 'anthropic', 'custom-openai-compat');

-- CreateTable
CREATE TABLE "llm_connections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "LlmKind" NOT NULL,
    "base_url" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "api_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llm_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "llm_connections_is_active_idx" ON "llm_connections"("is_active");
