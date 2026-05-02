-- Add pinned_messages table for chat pin feature
CREATE TABLE "pinned_messages" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "pinned_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pinned_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pinned_messages_channel_id_message_id_key" ON "pinned_messages"("channel_id", "message_id");
CREATE INDEX "pinned_messages_channel_id_idx" ON "pinned_messages"("channel_id");

ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_pinned_by_fkey" FOREIGN KEY ("pinned_by") REFERENCES "users"("id") ON UPDATE CASCADE;
