-- Run with psql directly. CONCURRENTLY reduces table write blocking on production.
-- Example:
-- cat prisma/add_transaction_date_indexes.sql | docker exec -i biweb-postgres psql -U postgres -d biweb

CREATE INDEX CONCURRENTLY IF NOT EXISTS gift_room_id_ts_desc_idx
ON gift (room_id, ts DESC)
WHERE ts IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS guard_room_id_ts_desc_idx
ON guard (room_id, ts DESC)
WHERE ts IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS super_chat_room_id_ts_desc_idx
ON super_chat (room_id, ts DESC)
WHERE ts IS NOT NULL;
