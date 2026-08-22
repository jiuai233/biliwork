-- Phase 1 index cleanup. Each statement must run outside a transaction
-- (CREATE/DROP INDEX CONCURRENTLY and REINDEX CONCURRENTLY require that).
--
-- Apply:
--   cat prisma/optimize_event_indexes.sql | docker exec -i biweb-postgres psql -U postgres -d biweb -v ON_ERROR_STOP=1
--
-- Intent:
--   1. Rebuild ranking covering indexes without uface (avatar URL bloat).
--   2. Drop danmaku_room_id_idx; (room_id, ts) covering already prefixes room_id.
--   3. Add live_status (room_id, ts DESC) used by DISTINCT ON / latest-status queries.
--   4. Reindex bloated danmaku unique/pk/ts indexes after archive deletes.

SET maintenance_work_mem = '256MB';

CREATE INDEX CONCURRENTLY IF NOT EXISTS danmaku_room_id_ts_uname_idx
ON danmaku (room_id, ts)
INCLUDE (uname)
WHERE ts IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS gift_room_id_ts_cover_idx
ON gift (room_id, ts)
INCLUDE (uname, r_price, gift_num)
WHERE ts IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS guard_room_id_ts_cover_idx
ON guard (room_id, ts)
INCLUDE (uname, price)
WHERE ts IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS super_chat_room_id_ts_cover_idx
ON super_chat (room_id, ts)
INCLUDE (uname, rmb)
WHERE ts IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS live_status_room_id_ts_idx
ON live_status (room_id, ts DESC)
WHERE ts IS NOT NULL;

DROP INDEX CONCURRENTLY IF EXISTS danmaku_ranking_room_ts_cover_idx;
DROP INDEX CONCURRENTLY IF EXISTS gift_ranking_room_ts_cover_idx;
DROP INDEX CONCURRENTLY IF EXISTS guard_ranking_room_ts_cover_idx;
DROP INDEX CONCURRENTLY IF EXISTS super_chat_ranking_room_ts_cover_idx;
DROP INDEX CONCURRENTLY IF EXISTS danmaku_room_id_idx;

REINDEX INDEX CONCURRENTLY danmaku_msg_id_key;
REINDEX INDEX CONCURRENTLY danmaku_pkey;
REINDEX INDEX CONCURRENTLY danmaku_ts_idx;

ANALYZE danmaku;
ANALYZE gift;
ANALYZE guard;
ANALYZE super_chat;
ANALYZE live_status;
