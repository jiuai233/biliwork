-- 平台用户 + 登录方式；身份码改为可空

CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "password_hash" TEXT,
    "last_login_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_identities" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_uid" TEXT NOT NULL,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_identities_provider_provider_uid_key" ON "user_identities"("provider", "provider_uid");
CREATE INDEX "user_identities_user_id_idx" ON "user_identities"("user_id");

ALTER TABLE "user_identities"
    ADD CONSTRAINT "user_identities_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "users" ("id", "name", "avatar", "password_hash", "last_login_at", "created_at", "updated_at")
SELECT "id", "uname", "uface", "password_hash", "last_login_at", "created_at", "updated_at"
FROM "broadcasters";

SELECT setval(
    pg_get_serial_sequence('users', 'id'),
    COALESCE((SELECT MAX(id) FROM "users"), 1),
    EXISTS(SELECT 1 FROM "users")
);

INSERT INTO "user_identities" ("user_id", "provider", "provider_uid", "created_at")
SELECT "id", 'bilibili', "uid"::text, "created_at"
FROM "broadcasters"
WHERE "uid" IS NOT NULL
ON CONFLICT ("provider", "provider_uid") DO NOTHING;

ALTER TABLE "broadcasters" ADD COLUMN "user_id" INTEGER;

UPDATE "broadcasters" SET "user_id" = "id" WHERE "user_id" IS NULL;

ALTER TABLE "broadcasters" ALTER COLUMN "user_id" SET NOT NULL;

CREATE UNIQUE INDEX "broadcasters_user_id_key" ON "broadcasters"("user_id");

ALTER TABLE "broadcasters"
    ADD CONSTRAINT "broadcasters_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "broadcasters" ALTER COLUMN "auth_code" DROP NOT NULL;

UPDATE "broadcasters"
SET "auth_code" = NULL, "active" = 0
WHERE "auth_code" LIKE 'qr-%';
