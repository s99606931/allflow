-- AddColumn: User.avatarUrl (base64 data URL stored inline; max ~2.7MB after base64 encoding of 2MB binary)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
