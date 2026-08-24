-- B站网页登录态 + 创作者中心礼物流水
-- 在已有库上手动执行，或通过 prisma db push 同步 schema.prisma

CREATE TABLE IF NOT EXISTS "broadcaster_bili_sessions" (
    "id" SERIAL NOT NULL,
    "broadcaster_id" INTEGER NOT NULL,
    "cookie_enc" TEXT NOT NULL,
    "cookie_uid" BIGINT NOT NULL,
    "bound_at" BIGINT NOT NULL,
    "sync_status" TEXT NOT NULL DEFAULT 'idle',
    "sync_error" TEXT,
    "sync_at" BIGINT,
    "sync_from" TEXT,
    "sync_to" TEXT,
    "sync_raw_count" INTEGER NOT NULL DEFAULT 0,
    "sync_unique_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "broadcaster_bili_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "broadcaster_bili_sessions_broadcaster_id_key"
    ON "broadcaster_bili_sessions"("broadcaster_id");

ALTER TABLE "broadcaster_bili_sessions"
    DROP CONSTRAINT IF EXISTS "broadcaster_bili_sessions_broadcaster_id_fkey";
ALTER TABLE "broadcaster_bili_sessions"
    ADD CONSTRAINT "broadcaster_bili_sessions_broadcaster_id_fkey"
    FOREIGN KEY ("broadcaster_id") REFERENCES "broadcasters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "received_gift" (
    "id" BIGSERIAL NOT NULL,
    "broadcaster_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,
    "uid" BIGINT NOT NULL,
    "uname" TEXT,
    "time" TEXT NOT NULL,
    "ts" BIGINT,
    "goods_id" INTEGER,
    "gift_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "num" INTEGER NOT NULL DEFAULT 1,
    "hamster" INTEGER NOT NULL DEFAULT 0,
    "receive_title" TEXT,
    "unique_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "received_gift_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "received_gift_unique_key_key" ON "received_gift"("unique_key");
CREATE INDEX IF NOT EXISTS "received_gift_broadcaster_id_ts_idx" ON "received_gift"("broadcaster_id", "ts");
CREATE INDEX IF NOT EXISTS "received_gift_broadcaster_id_gift_id_idx" ON "received_gift"("broadcaster_id", "gift_id");

ALTER TABLE "received_gift"
    DROP CONSTRAINT IF EXISTS "received_gift_broadcaster_id_fkey";
ALTER TABLE "received_gift"
    ADD CONSTRAINT "received_gift_broadcaster_id_fkey"
    FOREIGN KEY ("broadcaster_id") REFERENCES "broadcasters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
