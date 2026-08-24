-- 公开 /gift 邀请码：过期时间 + 最大访问次数

CREATE TABLE "gift_invites" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "max_uses" INTEGER NOT NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" BIGINT NOT NULL,
    "note" TEXT,
    "disabled" INTEGER NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "gift_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gift_invites_code_key" ON "gift_invites"("code");
CREATE INDEX "gift_invites_expires_at_idx" ON "gift_invites"("expires_at");
