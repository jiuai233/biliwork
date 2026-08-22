import { env } from './config.js';
import { pool } from './db.js';
import { logger } from './logger.js';
import { BilibiliClient, type ClientUnhealthyInfo } from './bilibili/client.js';
import { probeUnknownLiveRooms } from './bilibili/liveProbe.js';
import { saveDanmaku, saveGift, saveGuard, saveLiveStatus, saveSuperChat } from './repositories/events.js';
import { LIVE_START_CONCURRENCY, partitionStartOrder, reconnectBackoffMs, startSpacingMs } from './startPolicy.js';

const SYNC_INTERVAL_MS = 10_000;
const START_ACCESS_LIMIT_COOLDOWN_MS = 120_000;

interface BroadcasterStartRow {
    auth_code: string;
    room_id: number | null;
    is_start: number | null;
}

export class CollectorManager {
    private collectors = new Map<string, BilibiliClient>();
    private starting = new Set<string>();
    private liveQueue: string[] = [];
    private startQueue: string[] = [];
    private queuedStarts = new Set<string>();
    private startFailures = new Map<string, number>();
    private unhealthyFailures = new Map<string, number>();
    private lastKnownLive = new Set<string>();
    private authStartCooldownUntil = new Map<string, number>();
    private reconnectTimers = new Map<string, NodeJS.Timeout>();
    private startQueueRunning = false;
    private globalStartCooldownUntil = 0;
    private wakeStartQueue?: () => void;
    private timer?: NodeJS.Timeout;
    private stopped = false;
    private restarting = false;
    private probingLive = false;
    private coldStartProbed = false;

    start() {
        logger.info('Collector Manager started');
        void this.syncBroadcasters();
        this.timer = setInterval(() => {
            void this.syncBroadcasters();
        }, SYNC_INTERVAL_MS);
    }

    stop() {
        logger.info('Stopping Collector Manager');
        this.stopped = true;
        if (this.timer) clearInterval(this.timer);
        for (const timer of this.reconnectTimers.values()) clearTimeout(timer);
        this.reconnectTimers.clear();
        this.wakeStartQueue?.();
        this.wakeStartQueue = undefined;
        for (const client of this.collectors.values()) {
            client.close();
        }
        this.collectors.clear();
        this.starting.clear();
        this.liveQueue = [];
        this.startQueue = [];
        this.queuedStarts.clear();
        this.startFailures.clear();
        this.unhealthyFailures.clear();
        this.lastKnownLive.clear();
        this.authStartCooldownUntil.clear();
    }

    async restartAll() {
        if (this.restarting) {
            logger.warn('Scheduled restart already running');
            return;
        }

        this.restarting = true;
        logger.info('Scheduled restart: refreshing all collectors');

        try {
            const rows = await this.loadBroadcasterStartRows();
            const { live, rest } = partitionStartOrder(
                rows.map((row) => ({
                    authCode: row.auth_code,
                    live: row.is_start === 1,
                })),
            );
            this.refreshKnownLive(live);

            for (const client of this.collectors.values()) {
                client.close();
            }
            this.collectors.clear();

            for (const authCode of live) this.enqueueStart(authCode, true);
            for (const authCode of rest) this.enqueueStart(authCode, false);

            logger.info({ live: live.length, rest: rest.length }, 'Scheduled restart queued');
        } catch (error) {
            logger.error({ error }, 'Scheduled restart failed to rebuild queue');
            for (const authCode of this.collectors.keys()) {
                this.enqueueStart(authCode, this.lastKnownLive.has(authCode));
            }
        } finally {
            this.restarting = false;
        }
    }

    private async syncBroadcasters() {
        if (this.stopped) return;

        try {
            const rows = await this.loadBroadcasterStartRows();
            const { live, rest } = partitionStartOrder(
                rows.map((row) => ({
                    authCode: row.auth_code,
                    live: row.is_start === 1,
                })),
            );
            this.refreshKnownLive(live);
            const activeAuthCodes = new Set(rows.map((row) => row.auth_code));

            if (!this.restarting) {
                for (const authCode of live) this.enqueueStart(authCode, true);
                for (const authCode of rest) this.enqueueStart(authCode, false);
            }

            for (const [authCode, client] of this.collectors.entries()) {
                if (!activeAuthCodes.has(authCode)) {
                    logger.info({ auth: authCode.slice(0, 8) }, 'Stopping collector');
                    client.close();
                    this.collectors.delete(authCode);
                    this.lastKnownLive.delete(authCode);
                }
            }

            if (this.collectors.size > 0) this.coldStartProbed = false;

            const coldStart = this.collectors.size === 0 && (this.liveQueue.length + this.startQueue.length) > 0;
            if (coldStart && !this.coldStartProbed) {
                this.coldStartProbed = true;
                const unknown = rows.filter((row) => row.room_id && row.is_start !== 1);
                void this.probeAndBoostLive(unknown.map((row) => ({
                    authCode: row.auth_code,
                    roomId: row.room_id as number,
                })));
            }
        } catch (error) {
            logger.error({ error }, 'Failed to sync broadcasters');
        }
    }

    private async loadBroadcasterStartRows(): Promise<BroadcasterStartRow[]> {
        const result = await pool.query<BroadcasterStartRow>(`
            SELECT b.auth_code, b.room_id, ls.is_start
            FROM broadcasters b
            LEFT JOIN LATERAL (
                SELECT is_start
                FROM live_status
                WHERE room_id = b.room_id AND ts IS NOT NULL
                ORDER BY ts DESC
                LIMIT 1
            ) ls ON true
            WHERE b.active = 1
        `);
        return result.rows;
    }

    private refreshKnownLive(liveAuthCodes: string[]) {
        this.lastKnownLive = new Set(liveAuthCodes);
    }

    private async probeAndBoostLive(rooms: { authCode: string; roomId: number }[]) {
        if (this.stopped || this.probingLive || rooms.length === 0) return;

        this.probingLive = true;
        logger.info({ rooms: rooms.length }, 'Probing Bilibili room info to boost live starts');
        try {
            await probeUnknownLiveRooms(
                rooms,
                (authCode) => {
                    if (this.stopped) return;
                    this.lastKnownLive.add(authCode);
                    this.promoteToLive(authCode);
                },
                { shouldStop: () => this.stopped },
            );
        } catch (error) {
            logger.warn({ error }, 'Live room probe failed');
        } finally {
            this.probingLive = false;
        }
    }

    private promoteToLive(authCode: string) {
        if (this.stopped || this.collectors.has(authCode) || this.starting.has(authCode)) return;

        const cooldownUntil = this.authStartCooldownUntil.get(authCode) ?? 0;
        if (cooldownUntil > Date.now()) return;

        const normalIndex = this.startQueue.indexOf(authCode);
        if (normalIndex >= 0) this.startQueue.splice(normalIndex, 1);
        if (this.liveQueue.includes(authCode)) return;

        this.liveQueue.push(authCode);
        this.queuedStarts.add(authCode);
        logger.info({ auth: authCode.slice(0, 8) }, 'Promoted collector start because room is live');
        void this.processStartQueue();
    }

    private enqueueStart(authCode: string, live = false) {
        if (this.stopped) return;
        if (this.collectors.has(authCode)) return;
        if (this.starting.has(authCode)) return;

        const cooldownUntil = this.authStartCooldownUntil.get(authCode) ?? 0;
        if (cooldownUntil > Date.now()) return;

        if (live) {
            this.promoteToLive(authCode);
            return;
        }

        if (this.queuedStarts.has(authCode)) return;

        this.queuedStarts.add(authCode);
        this.startQueue.push(authCode);
        void this.processStartQueue();
    }

    private takeLiveStart(): string | undefined {
        const authCode = this.liveQueue.shift();
        if (authCode) this.queuedStarts.delete(authCode);
        return authCode;
    }

    private takeRestStart(): string | undefined {
        const authCode = this.startQueue.shift();
        if (authCode) this.queuedStarts.delete(authCode);
        return authCode;
    }

    private async processStartQueue() {
        if (this.startQueueRunning) return;

        this.startQueueRunning = true;
        const liveInFlight = new Set<Promise<void>>();
        try {
            while (!this.stopped && (this.liveQueue.length > 0 || this.startQueue.length > 0 || liveInFlight.size > 0)) {
                const cooldownMs = this.globalStartCooldownUntil - Date.now();
                if (cooldownMs > 0) {
                    logger.warn({
                        cooldownMs,
                        liveQueued: this.liveQueue.length,
                        liveInFlight: liveInFlight.size,
                        queued: this.startQueue.length,
                    }, 'Start queue paused after Bilibili access limit');
                    await this.waitForStartQueue(cooldownMs);
                    continue;
                }

                while (
                    !this.stopped
                    && this.liveQueue.length > 0
                    && liveInFlight.size < LIVE_START_CONCURRENCY
                ) {
                    const authCode = this.takeLiveStart();
                    if (!authCode) break;
                    logger.info({
                        auth: authCode.slice(0, 8),
                        inFlight: liveInFlight.size + 1,
                        concurrency: LIVE_START_CONCURRENCY,
                    }, 'Dispatching live collector start');
                    const task: Promise<void> = this.runQueuedStart(authCode, true).finally(() => {
                        liveInFlight.delete(task);
                    });
                    liveInFlight.add(task);
                }

                if (liveInFlight.size > 0) {
                    await Promise.race(liveInFlight);
                    continue;
                }

                const authCode = this.takeRestStart();
                if (!authCode) break;

                await this.runQueuedStart(authCode, false);

                if (!this.stopped && (this.liveQueue.length > 0 || this.startQueue.length > 0)) {
                    await this.waitForStartQueue(startSpacingMs(this.liveQueue.length > 0));
                }
            }
        } finally {
            this.startQueueRunning = false;
            if (!this.stopped && (this.liveQueue.length > 0 || this.startQueue.length > 0)) {
                void this.processStartQueue();
            }
        }
    }

    private async runQueuedStart(authCode: string, live: boolean) {
        const active = await this.isBroadcasterActive(authCode);
        if (active === false) {
            logger.info({ auth: authCode.slice(0, 8) }, 'Skipping collector start because broadcaster is inactive');
            return;
        }
        if (active === undefined) {
            this.enqueueStart(authCode, live);
            return;
        }

        await this.startCollector(authCode);
    }

    private async isBroadcasterActive(authCode: string): Promise<boolean | undefined> {
        try {
            const result = await pool.query<{ auth_code: string }>(
                'SELECT auth_code FROM broadcasters WHERE auth_code = $1 AND active = 1 LIMIT 1',
                [authCode],
            );
            return result.rows.length > 0;
        } catch (error) {
            logger.error({ error, auth: authCode.slice(0, 8) }, 'Failed to verify broadcaster before collector start');
            return undefined;
        }
    }

    private async startCollector(authCode: string) {
        if (this.stopped || this.starting.has(authCode) || this.collectors.has(authCode)) return;

        this.starting.add(authCode);
        logger.info({
            auth: authCode.slice(0, 8),
            live: this.lastKnownLive.has(authCode),
        }, 'Starting collector');

        const client = new BilibiliClient(
            env.BILI_ACCESS_KEY_ID,
            env.BILI_ACCESS_KEY_SECRET,
            env.BILI_APP_ID,
            authCode,
        );

        client.onDanmaku = async (message) => {
            try {
                await saveDanmaku(message);
            } catch (error) {
                logger.error({ error }, 'Save danmaku failed');
            }
        };
        client.onGift = async (message) => {
            try {
                await saveGift(message);
            } catch (error) {
                logger.error({ error }, 'Save gift failed');
            }
        };
        client.onGuard = async (message) => {
            try {
                await saveGuard(message);
            } catch (error) {
                logger.error({ error }, 'Save guard failed');
            }
        };
        client.onSuperChat = async (message) => {
            try {
                await saveSuperChat(message);
            } catch (error) {
                logger.error({ error }, 'Save super chat failed');
            }
        };
        client.onLiveStatus = async (message) => {
            try {
                logger.info({
                    room: message.roomId,
                    action: message.isStart ? '开播' : '下播',
                    title: message.title,
                }, 'Live status');
                if (message.isStart) this.lastKnownLive.add(authCode);
                else this.lastKnownLive.delete(authCode);
                await saveLiveStatus(message);
            } catch (error) {
                logger.error({ error }, 'Save live status failed');
            }
        };
        client.onStarted = async (info) => {
            try {
                await pool.query(
                    `
                    UPDATE broadcasters
                    SET room_id = $1,
                        uid = $2,
                        uname = $3,
                        uface = $4,
                        open_id = $5,
                        updated_at = $6
                    WHERE auth_code = $7
                    `,
                    [
                        info.roomId,
                        info.uid.toString(),
                        info.uname,
                        info.uface,
                        info.openId,
                        Date.now().toString(),
                        authCode,
                    ],
                );
            } catch (error) {
                logger.error({ error, auth: authCode.slice(0, 8) }, 'Update broadcaster profile failed');
            }
        };
        client.onUnhealthy = (info) => {
            this.handleClientUnhealthy(authCode, client, info);
        };

        try {
            await client.start();
            if (this.stopped) {
                client.close();
                return;
            }
            if (this.collectors.has(authCode)) {
                client.close();
                return;
            }
            this.collectors.set(authCode, client);
            this.startFailures.delete(authCode);
            this.unhealthyFailures.delete(authCode);
            this.authStartCooldownUntil.delete(authCode);
        } catch (error) {
            logger.error({ error, auth: authCode.slice(0, 8) }, 'Collector start failed');
            await this.handleStartFailure(authCode, error);
            client.close();
        } finally {
            this.starting.delete(authCode);
        }
    }

    private waitForStartQueue(ms: number) {
        return new Promise<void>((resolve) => {
            const timer = setTimeout(done, ms);
            const self = this;
            function done() {
                clearTimeout(timer);
                if (self.wakeStartQueue === done) self.wakeStartQueue = undefined;
                resolve();
            }
            this.wakeStartQueue = done;
        });
    }

    private handleClientUnhealthy(authCode: string, client: BilibiliClient, info: ClientUnhealthyInfo) {
        if (this.stopped) return;

        const current = this.collectors.get(authCode);
        if (current !== client) {
            logger.warn({
                auth: authCode.slice(0, 8),
                reason: info.reason,
                failures: info.failures,
            }, 'Ignoring stale unhealthy collector');
            return;
        }

        const live = this.lastKnownLive.has(authCode);
        const failures = (this.unhealthyFailures.get(authCode) ?? 0) + 1;
        this.unhealthyFailures.set(authCode, failures);
        const delayMs = reconnectBackoffMs(failures, live);
        this.authStartCooldownUntil.set(authCode, Date.now() + delayMs);

        logger.warn({
            auth: authCode.slice(0, 8),
            reason: info.reason,
            failures: info.failures,
            reconnectInMs: delayMs,
            live,
        }, 'Collector unhealthy; restarting with backoff');

        client.close();
        this.collectors.delete(authCode);
        this.scheduleReconnect(authCode, delayMs, live);
    }

    private scheduleReconnect(authCode: string, delayMs: number, live: boolean) {
        const existing = this.reconnectTimers.get(authCode);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(() => {
            this.reconnectTimers.delete(authCode);
            this.authStartCooldownUntil.delete(authCode);
            this.enqueueStart(authCode, live);
        }, delayMs);
        this.reconnectTimers.set(authCode, timer);
    }

    private async handleStartFailure(authCode: string, error: unknown) {
        const apiError = parseStartGameApiError(error);
        if (apiError?.code === 4009 || apiError?.message === '接口访问限制') {
            const cooldownUntil = Date.now() + START_ACCESS_LIMIT_COOLDOWN_MS;
            this.globalStartCooldownUntil = Math.max(this.globalStartCooldownUntil, cooldownUntil);
            this.authStartCooldownUntil.set(authCode, cooldownUntil);
            logger.warn({
                auth: authCode.slice(0, 8),
                code: apiError.code,
                message: apiError.message,
                requestId: apiError.request_id,
                cooldownMs: START_ACCESS_LIMIT_COOLDOWN_MS,
            }, 'Bilibili start_game access limited; start queue cooling down');
            this.scheduleReconnect(authCode, START_ACCESS_LIMIT_COOLDOWN_MS, this.lastKnownLive.has(authCode));
            return;
        }

        if (!isAuthCodeInvalidError(error)) {
            const live = this.lastKnownLive.has(authCode);
            const failures = (this.unhealthyFailures.get(authCode) ?? 0) + 1;
            this.unhealthyFailures.set(authCode, failures);
            const delayMs = reconnectBackoffMs(failures, live);
            this.authStartCooldownUntil.set(authCode, Date.now() + delayMs);
            this.scheduleReconnect(authCode, delayMs, live);
            return;
        }

        const failures = (this.startFailures.get(authCode) ?? 0) + 1;
        this.startFailures.set(authCode, failures);

        logger.warn({
            auth: authCode.slice(0, 8),
            failures,
        }, 'Auth code validation failed');

        if (failures < 5) {
            const delayMs = reconnectBackoffMs(failures, false);
            this.authStartCooldownUntil.set(authCode, Date.now() + delayMs);
            this.scheduleReconnect(authCode, delayMs, false);
            return;
        }

        try {
            await pool.query(
                'UPDATE broadcasters SET active = 0, updated_at = $1 WHERE auth_code = $2',
                [Date.now().toString(), authCode],
            );
            this.startFailures.delete(authCode);
            this.collectors.delete(authCode);
            logger.error({
                auth: authCode.slice(0, 8),
                failures,
            }, 'Auth code appears invalid after 5 attempts; broadcaster monitoring disabled');
        } catch (updateError) {
            logger.error({ updateError, auth: authCode.slice(0, 8) }, 'Failed to disable invalid broadcaster');
        }
    }
}

interface StartGameApiError {
    code?: number;
    message?: string;
    request_id?: string;
}

function parseStartGameApiError(error: unknown): StartGameApiError | undefined {
    const message = error instanceof Error ? error.message : String(error);
    const match = message.match(/start_game api error: (\{.*\})/);
    if (!match) return undefined;

    try {
        const parsed = JSON.parse(match[1]) as unknown;
        if (!parsed || typeof parsed !== 'object') return undefined;

        const record = parsed as Record<string, unknown>;
        return {
            code: typeof record.code === 'number' ? record.code : undefined,
            message: typeof record.message === 'string' ? record.message : undefined,
            request_id: typeof record.request_id === 'string' ? record.request_id : undefined,
        };
    } catch {
        return undefined;
    }
}

function isAuthCodeInvalidError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('start_game api error')) return false;

    return /身份码|验证码|invalid|expired|expire|无效|失效|不存在|过期/i.test(message);
}
