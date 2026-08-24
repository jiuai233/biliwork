import { cookieEncryptionSecret, decryptCookie } from '../biliCookie.js';
import { fetchGiftStreamMonth } from '../bilibili/giftStreamClient.js';
import { pool } from '../db.js';
import {
    defaultGiftStreamRange,
    giftStreamUniqueKey,
    giftTimeToTs,
    resumeBegin,
    splitMonthRanges,
    type GiftStreamItem,
} from '../giftStreamRange.js';
import { logger } from '../logger.js';

const POLL_MS = 2_000;
const STALE_MS = 10 * 60 * 1000;

type SessionRow = {
    id: number;
    broadcaster_id: number;
    cookie_enc: string;
    sync_cursor: string | null;
    sync_from: string | null;
    sync_to: string | null;
    sync_raw_count: number;
};

let stopped = false;

export function startGiftStreamLoop(): void {
    stopped = false;
    void loop();
}

export function stopGiftStreamLoop(): void {
    stopped = true;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reclaimStale(): Promise<void> {
    const cutoff = Date.now() - STALE_MS;
    const result = await pool.query(
        `UPDATE broadcaster_bili_sessions
         SET sync_status = 'queued', updated_at = $1
         WHERE sync_status = 'running' AND updated_at < $2`,
        [Date.now(), cutoff],
    );
    if ((result.rowCount ?? 0) > 0) {
        logger.info({ count: result.rowCount }, 'Requeued stale gift-stream jobs');
    }
}

async function claimNext(): Promise<SessionRow | null> {
    const now = Date.now();
    const result = await pool.query<SessionRow>(
        `WITH next AS (
            SELECT id FROM broadcaster_bili_sessions
            WHERE sync_status = 'queued'
            ORDER BY updated_at
            FOR UPDATE SKIP LOCKED
            LIMIT 1
         )
         UPDATE broadcaster_bili_sessions s
         SET sync_status = 'running', sync_error = NULL, updated_at = $1
         FROM next
         WHERE s.id = next.id
         RETURNING s.id, s.broadcaster_id, s.cookie_enc, s.sync_cursor, s.sync_from, s.sync_to, s.sync_raw_count`,
        [now],
    );
    return result.rows[0] ?? null;
}

async function insertGifts(broadcasterId: number, items: GiftStreamItem[]): Promise<void> {
    const batchSize = 200;
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const params: unknown[] = [];
        const values: string[] = [];
        for (const item of batch) {
            const offset = params.length;
            const ts = giftTimeToTs(item.time);
            values.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13})`,
            );
            params.push(
                broadcasterId,
                item.room_id,
                item.uid,
                item.uname || null,
                item.time,
                ts,
                item.goods_id,
                item.gift_id,
                item.name,
                item.num,
                item.hamster,
                item.receive_title || null,
                `${broadcasterId}|${giftStreamUniqueKey(item)}`,
            );
        }
        await pool.query(
            `INSERT INTO received_gift (
                broadcaster_id, room_id, uid, uname, time, ts, goods_id, gift_id, name, num, hamster, receive_title, unique_key
             ) VALUES ${values.join(', ')}
             ON CONFLICT (unique_key) DO NOTHING`,
            params,
        );
    }
}

async function runJob(row: SessionRow): Promise<void> {
    const cookie = decryptCookie(row.cookie_enc, cookieEncryptionSecret());
    if (!cookie) {
        throw new Error('Cookie 解密失败，请重新扫码');
    }

    const range = defaultGiftStreamRange();
    const begin = resumeBegin(row.sync_from || range.begin, row.sync_cursor);
    const end = row.sync_to && row.sync_to <= range.end ? row.sync_to : range.end;
    const months = splitMonthRanges(begin, end);
    let rawCount = row.sync_raw_count || 0;

    logger.info({
        broadcasterId: row.broadcaster_id,
        begin,
        end,
        months: months.length,
        cursor: row.sync_cursor,
    }, 'Gift stream job started');

    for (const month of months) {
        if (stopped) return;
        const fetched = await fetchGiftStreamMonth({ cookie, begin: month.begin, end: month.end });
        rawCount += fetched.rawCount;
        await insertGifts(row.broadcaster_id, fetched.unique);
        await pool.query(
            `UPDATE broadcaster_bili_sessions
             SET sync_cursor = $1, sync_raw_count = $2, updated_at = $3
             WHERE id = $4 AND sync_status = 'running'`,
            [month.end, rawCount, Date.now(), row.id],
        );
        logger.info({
            broadcasterId: row.broadcaster_id,
            month: `${month.begin}-${month.end}`,
            unique: fetched.unique.length,
            raw: fetched.rawCount,
        }, 'Gift stream month done');
    }

    const counted = await pool.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM received_gift WHERE broadcaster_id = $1',
        [row.broadcaster_id],
    );
    await pool.query(
        `UPDATE broadcaster_bili_sessions
         SET sync_status = 'done', sync_error = NULL, sync_at = $1, sync_from = $2, sync_to = $3,
             sync_raw_count = $4, sync_unique_count = $5, updated_at = $1
         WHERE id = $6`,
        [Date.now(), begin, end, rawCount, Number(counted.rows[0]?.count ?? 0), row.id],
    );
}

async function failJob(id: number, message: string): Promise<void> {
    await pool.query(
        `UPDATE broadcaster_bili_sessions
         SET sync_status = 'error', sync_error = $1, updated_at = $2
         WHERE id = $3`,
        [message.slice(0, 500), Date.now(), id],
    );
}

async function loop(): Promise<void> {
    logger.info('Gift stream loop started');
    while (!stopped) {
        try {
            await reclaimStale();
            const job = await claimNext();
            if (!job) {
                await sleep(POLL_MS);
                continue;
            }
            try {
                await runJob(job);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                logger.error({ error, broadcasterId: job.broadcaster_id }, 'Gift stream job failed');
                await failJob(job.id, message);
            }
        } catch (error) {
            logger.error({ error }, 'Gift stream loop error');
            await sleep(POLL_MS);
        }
    }
    logger.info('Gift stream loop stopped');
}
