-- B 站 goods_id 可能超过 INTEGER（2^31-1），写入会 22003。
ALTER TABLE "received_gift" ALTER COLUMN "goods_id" TYPE BIGINT;
