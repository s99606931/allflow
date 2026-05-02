-- UserNotificationSettings
CREATE TABLE "user_notification_settings" (
  "user_id" TEXT NOT NULL,
  "channels" JSONB NOT NULL DEFAULT '{"email":true,"inApp":true,"desktop":false,"mobile":false}',
  "types" JSONB NOT NULL DEFAULT '{"approvals":true,"mentions":true,"digests":false}',
  "digest_hour" INTEGER NOT NULL DEFAULT 9,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("user_id")
);

-- ApiToken
CREATE TABLE "api_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "prefix" VARCHAR(8) NOT NULL,
  "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "last_used_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "api_tokens_token_hash_key" ON "api_tokens"("token_hash");
CREATE INDEX "api_tokens_user_id_idx" ON "api_tokens"("user_id");

-- OtelConfig
CREATE TABLE "otel_config" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "endpoint" TEXT,
  "service_name" TEXT NOT NULL DEFAULT 'all-flow-backend',
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "otel_config_pkey" PRIMARY KEY ("id")
);
