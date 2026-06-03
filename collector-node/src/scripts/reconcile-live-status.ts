import { closeDb, pool } from '../db.js';
import { generateSnowflakeId } from '../snowflake.js';

const BILI_ROOM_INFO_URL = 'https://api.live.bilibili.com/room/v1/Room/get_info';

interface BroadcasterRow {
    room_id: number;
    uname: string | null;
}

interface LatestStatusRow {
    room_id: number;
    is_start: number;
}

interface BiliRoomInfoResponse {
    code: number;
    message?: string;
    data?: {
        room_id?: number;
        title?: string;
        area_name?: string;
        live_status?: number;
    };
}

interface Args {
    apply: boolean;
    roomIds: Set<number>;
    limit?: number;
    delayMs: number;
}

function parseArgs(argv: string[]): Args {
    const args: Args = {
        apply: false,
        roomIds: new Set<number>(),
        delayMs: 300,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];

        if (arg === '--apply') {
            args.apply = true;
        } else if (arg === '--room-id') {
            const value = Number(argv[index + 1]);
            if (!Number.isInteger(value)) throw new Error('--room-id requires an integer');
            args.roomIds.add(value);
            index += 1;
        } else if (arg === '--limit') {
            const value = Number(argv[index + 1]);
            if (!Number.isInteger(value) || value < 1) throw new Error('--limit requires a positive integer');
            args.limit = value;
            index += 1;
        } else if (arg === '--delay-ms') {
            const value = Number(argv[index + 1]);
            if (!Number.isInteger(value) || value < 0) throw new Error('--delay-ms requires a non-negative integer');
            args.delayMs = value;
            index += 1;
        } else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    return args;
}

function printHelp() {
    console.log(`
Usage:
  npm run build
  npm run reconcile:live-status -- [--apply] [--room-id 123] [--limit 20] [--delay-ms 300]

Default mode is dry-run. Add --apply to insert reconcile events.
`);
}

async function fetchBiliRoomInfo(roomId: number) {
    const url = new URL(BILI_ROOM_INFO_URL);
    url.searchParams.set('room_id', String(roomId));

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Bilibili room API returned HTTP ${response.status}`);
    }

    const payload = await response.json() as BiliRoomInfoResponse;
    if (payload.code !== 0 || !payload.data) {
        throw new Error(`Bilibili room API error: ${JSON.stringify(payload)}`);
    }

    return {
        isLive: payload.data.live_status === 1,
        title: payload.data.title || '[状态对账修正]',
        areaName: payload.data.area_name || '',
    };
}

async function loadBroadcasters(args: Args) {
    const result = await pool.query<BroadcasterRow>(`
        SELECT room_id, uname
        FROM broadcasters
        WHERE active = 1 AND room_id IS NOT NULL
        ORDER BY room_id
    `);

    let rows = result.rows;
    if (args.roomIds.size > 0) {
        rows = rows.filter((row) => args.roomIds.has(row.room_id));
    }
    if (args.limit !== undefined) {
        rows = rows.slice(0, args.limit);
    }

    return rows;
}

async function loadLatestStatuses(roomIds: number[]) {
    if (roomIds.length === 0) return new Map<number, boolean>();

    const result = await pool.query<LatestStatusRow>(`
        SELECT DISTINCT ON (room_id) room_id, is_start
        FROM live_status
        WHERE room_id = ANY($1::int[])
        ORDER BY room_id, ts DESC
    `, [roomIds]);

    return new Map(result.rows.map((row) => [row.room_id, row.is_start === 1]));
}

async function insertReconcileEvent(roomId: number, isLive: boolean, title: string, areaName: string) {
    const nowMs = Date.now();

    await pool.query(`
        INSERT INTO live_status (id, room_id, title, area_name, is_start, msg_id, ts, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (msg_id) DO NOTHING
    `, [
        generateSnowflakeId(),
        roomId,
        title,
        areaName,
        isLive ? 1 : 0,
        `reconcile_live_status_${roomId}_${nowMs}`,
        nowMs,
    ]);
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const broadcasters = await loadBroadcasters(args);
    const roomIds = broadcasters.map((row) => row.room_id);
    const latestStatuses = await loadLatestStatuses(roomIds);

    let checked = 0;
    let changed = 0;
    let failed = 0;

    console.log(args.apply ? 'Mode: apply' : 'Mode: dry-run');
    console.log(`Rooms: ${roomIds.length}`);

    for (const broadcaster of broadcasters) {
        checked += 1;

        try {
            const biliStatus = await fetchBiliRoomInfo(broadcaster.room_id);
            const dbIsLive = latestStatuses.get(broadcaster.room_id) ?? false;

            if (dbIsLive === biliStatus.isLive) {
                console.log(`[same] room=${broadcaster.room_id} live=${biliStatus.isLive} name=${broadcaster.uname ?? ''}`);
            } else {
                changed += 1;
                const action = biliStatus.isLive ? 'insert start' : 'insert end';
                console.log(`[diff] room=${broadcaster.room_id} db=${dbIsLive} bili=${biliStatus.isLive} action="${action}" title="${biliStatus.title}"`);

                if (args.apply) {
                    await insertReconcileEvent(
                        broadcaster.room_id,
                        biliStatus.isLive,
                        biliStatus.isLive ? biliStatus.title : '[状态对账修正]',
                        biliStatus.areaName,
                    );
                }
            }
        } catch (error) {
            failed += 1;
            console.error(`[fail] room=${broadcaster.room_id}`, error);
        }

        if (args.delayMs > 0) {
            await sleep(args.delayMs);
        }
    }

    console.log(`Done. checked=${checked} diffs=${changed} failed=${failed} applied=${args.apply}`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await closeDb();
    });
