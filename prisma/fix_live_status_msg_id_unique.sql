-- Fix live_status writes for collectors using:
-- ON CONFLICT (msg_id) DO NOTHING
--
-- PostgreSQL requires msg_id to have a unique or exclusion constraint.

DELETE FROM live_status a
USING live_status b
WHERE a.msg_id IS NOT NULL
  AND a.msg_id = b.msg_id
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS live_status_msg_id_key
ON live_status (msg_id);
