import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import parquet from 'parquetjs-lite';
import { pool } from '../db.js';
import { logger } from '../logger.js';

const { ParquetSchema, ParquetWriter } = parquet;

const schema = new ParquetSchema({
    id: { type: 'INT64' },
    room_id: { type: 'INT64' },
    uname: { type: 'UTF8' },
    msg: { type: 'UTF8' },
    ts: { type: 'INT64' },
    created_at: { type: 'UTF8' },
});

export async function runArchive() {
    const cutoffTs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(cutoffTs);
    const { year, week } = isoWeek(cutoffDate);
    const exportPath = path.join('exports', `danmaku_${year}_w${week}.parquet`);

    logger.info({ cutoff: cutoffDate.toISOString(), exportPath }, 'Starting archive');

    await mkdir(path.dirname(exportPath), { recursive: true });
    await exportToParquet(cutoffTs, exportPath);
    await purgeOldData(cutoffTs);

    logger.info({ exportPath }, 'Archiving completed');
}

async function exportToParquet(cutoffTs: number, exportPath: string) {
    const rows = await pool.query<{
        id: string;
        room_id: number;
        uname: string | null;
        msg: string | null;
        ts: string | null;
        created_at: Date;
    }>(
        'SELECT id, room_id, uname, msg, ts, created_at FROM danmaku WHERE ts < $1',
        [cutoffTs],
    );

    const writer = await ParquetWriter.openFile(schema, exportPath);
    try {
        for (const row of rows.rows) {
            await writer.appendRow({
                id: row.id,
                room_id: row.room_id,
                uname: row.uname || '',
                msg: row.msg || '',
                ts: row.ts || '0',
                created_at: row.created_at.toISOString(),
            });
        }
    } finally {
        await writer.close();
    }

    logger.info({ count: rows.rowCount, exportPath }, 'Exported danmaku rows');
}

async function purgeOldData(cutoffTs: number) {
    const batchSize = 10_000;
    let totalDeleted = 0;

    for (;;) {
        const result = await pool.query(`
            DELETE FROM danmaku
            WHERE id IN (
                SELECT id FROM danmaku
                WHERE ts < $1
                LIMIT $2
            )
        `, [cutoffTs, batchSize]);

        const deleted = result.rowCount || 0;
        totalDeleted += deleted;
        if (deleted < batchSize) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    logger.info({ totalDeleted }, 'Purged old danmaku rows');
}

function isoWeek(date: Date) {
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
    return { year: target.getUTCFullYear(), week };
}
