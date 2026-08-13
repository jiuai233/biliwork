npm notice run web@0.1.0 npx
npm notice run prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "broadcasters" (
    "id" SERIAL NOT NULL,
    "auth_code" TEXT NOT NULL,
    "room_id" INTEGER,
    "uid" BIGINT,
    "uname" TEXT,
    "uface" TEXT,
    "open_id" TEXT,
    "room_name" TEXT,
    "active" INTEGER NOT NULL DEFAULT 1,
    "password_hash" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "last_login_at" BIGINT,

    CONSTRAINT "broadcasters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "danmaku" (
    "id" BIGINT NOT NULL,
    "room_id" INTEGER NOT NULL,
    "open_id" TEXT,
    "uname" TEXT,
    "uface" TEXT,
    "msg" TEXT,
    "msg_id" TEXT,
    "dm_type" INTEGER NOT NULL DEFAULT 0,
    "emoji_img_url" TEXT,
    "fans_medal_level" INTEGER NOT NULL DEFAULT 0,
    "fans_medal_name" TEXT,
    "guard_level" INTEGER NOT NULL DEFAULT 0,
    "ts" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "danmaku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift" (
    "id" BIGINT NOT NULL,
    "room_id" INTEGER NOT NULL,
    "open_id" TEXT,
    "uname" TEXT,
    "uface" TEXT,
    "gift_id" INTEGER,
    "gift_name" TEXT,
    "gift_num" INTEGER NOT NULL DEFAULT 1,
    "gift_icon" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "r_price" INTEGER NOT NULL DEFAULT 0,
    "paid" INTEGER NOT NULL DEFAULT 0,
    "fans_medal_level" INTEGER NOT NULL DEFAULT 0,
    "fans_medal_name" TEXT,
    "guard_level" INTEGER NOT NULL DEFAULT 0,
    "msg_id" TEXT,
    "ts" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guard" (
    "id" BIGINT NOT NULL,
    "room_id" INTEGER NOT NULL,
    "open_id" TEXT,
    "uname" TEXT,
    "uface" TEXT,
    "guard_level" INTEGER,
    "guard_num" INTEGER NOT NULL DEFAULT 1,
    "guard_unit" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "fans_medal_level" INTEGER NOT NULL DEFAULT 0,
    "fans_medal_name" TEXT,
    "msg_id" TEXT,
    "ts" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_chat" (
    "id" BIGINT NOT NULL,
    "room_id" INTEGER NOT NULL,
    "open_id" TEXT,
    "uname" TEXT,
    "uface" TEXT,
    "message_id" BIGINT,
    "message" TEXT,
    "rmb" INTEGER NOT NULL DEFAULT 0,
    "start_time" BIGINT,
    "end_time" BIGINT,
    "guard_level" INTEGER NOT NULL DEFAULT 0,
    "fans_medal_level" INTEGER NOT NULL DEFAULT 0,
    "fans_medal_name" TEXT,
    "msg_id" TEXT,
    "ts" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_status" (
    "id" BIGINT NOT NULL,
    "room_id" INTEGER NOT NULL,
    "open_id" TEXT,
    "title" TEXT,
    "area_name" TEXT,
    "is_start" INTEGER NOT NULL DEFAULT 1,
    "msg_id" TEXT,
    "ts" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "broadcasters_auth_code_key" ON "broadcasters"("auth_code");

-- CreateIndex
CREATE INDEX "broadcasters_active_idx" ON "broadcasters"("active");

-- CreateIndex
CREATE INDEX "broadcasters_uid_idx" ON "broadcasters"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "danmaku_msg_id_key" ON "danmaku"("msg_id");

-- CreateIndex
CREATE INDEX "danmaku_room_id_idx" ON "danmaku"("room_id");

-- CreateIndex
CREATE INDEX "danmaku_ts_idx" ON "danmaku"("ts");

-- CreateIndex
CREATE INDEX "danmaku_room_id_ts_idx" ON "danmaku"("room_id", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "gift_msg_id_key" ON "gift"("msg_id");

-- CreateIndex
CREATE INDEX "gift_room_id_idx" ON "gift"("room_id");

-- CreateIndex
CREATE INDEX "gift_ts_idx" ON "gift"("ts");

-- CreateIndex
CREATE INDEX "gift_room_id_ts_idx" ON "gift"("room_id", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "guard_msg_id_key" ON "guard"("msg_id");

-- CreateIndex
CREATE INDEX "guard_room_id_idx" ON "guard"("room_id");

-- CreateIndex
CREATE INDEX "guard_ts_idx" ON "guard"("ts");

-- CreateIndex
CREATE INDEX "guard_room_id_ts_idx" ON "guard"("room_id", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "super_chat_msg_id_key" ON "super_chat"("msg_id");

-- CreateIndex
CREATE INDEX "super_chat_room_id_idx" ON "super_chat"("room_id");

-- CreateIndex
CREATE INDEX "super_chat_ts_idx" ON "super_chat"("ts");

-- CreateIndex
CREATE INDEX "super_chat_room_id_ts_idx" ON "super_chat"("room_id", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "live_status_msg_id_key" ON "live_status"("msg_id");

-- CreateIndex
CREATE INDEX "live_status_room_id_idx" ON "live_status"("room_id");

-- CreateIndex
CREATE INDEX "live_status_ts_idx" ON "live_status"("ts");

-- CreateIndex
CREATE INDEX "live_status_room_id_ts_idx" ON "live_status"("room_id", "ts");

