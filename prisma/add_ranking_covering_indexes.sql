-- Covering indexes for /dashboard/ranking aggregate queries.
-- Run each statement outside an explicit transaction.
-- Example:
-- cat prisma/add_ranking_covering_indexes.sql | docker exec -i biweb-postgres psql -U postgres -d biweb

CREATE INDEX CONCURRENTLY IF NOT EXISTS danmaku_ranking_room_ts_cover_idx
ON danmaku (room_id, ts)
INCLUDE (uname, uface)
WHERE ts IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS broadcasters_uid_idx
ON broadcasters (uid)
WHERE uid IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS gift_ranking_room_ts_cover_idx
ON gift (room_id, ts)
INCLUDE (uname, uface, r_price, gift_num)
WHERE ts IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS guard_ranking_room_ts_cover_idx
ON guard (room_id, ts)
INCLUDE (uname, uface, price)
WHERE ts IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS super_chat_ranking_room_ts_cover_idx
ON super_chat (room_id, ts)
INCLUDE (uname, uface, rmb)
WHERE ts IS NOT NULL;
