import { env } from './config.js';
import { pool } from './db.js';
import { logger } from './logger.js';
import { BilibiliClient, type ClientUnhealthyInfo } from './bilibili/client.js';
import { saveDanmaku, saveGift, saveGuard, saveLiveStatus, saveSuperChat } from './repositories/events.js';

const SYNC_INTERVAL_MS = 10_000;
const START_SPACING_MS = 3_000;
const START_ACCESS_LIMIT_COOLDOWN_MS = 120_000;

export class CollectorManager {
    private collectors = new Map<string, BilibiliClient>();
    private starting = new Set<string>();
    private startQueue: string[] = [];
    private queuedStarts = new Set<string>();
    private startFailures = new Map<string, number>();
    private authStartCooldownUntil = new Map<string, number>();
    private startQueueRunning = false;
    private globalStartCooldownUntil = 0;
    private timer?: NodeJS.Timeout;
    private stopped = false;
    private restarting = false;

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
        for (const client of this.collectors.values()) {
            client.close();
        }
        this.collectors.clear();
        this.starting.clear();
        this.startQueue = [];
        this.queuedStarts.clear();
        this.startFailures.clear();
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
            const authCodes = Array.from(this.collectors.keys());

            for (const authCode of authCodes) {
                const client = this.collectors.get(authCode);
                if (client) {
                    logger.info({ auth: authCode.slice(0, 8) }, 'Restarting collector');
                    client.close();
                    this.collectors.delete(authCode);
                }

                await sleep(2_000);
                this.enqueueStart(authCode);
                await sleep(START_SPACING_MS);
            }

            logger.info('Scheduled restart completed');
        } finally {
            this.restarting = false;
        }
    }

    private async syncBroadcasters() {
        if (this.stopped) return;

        try {
            const result = await pool.query<{ auth_code: string }>(
                'SELECT auth_code FROM broadcasters WHERE active = 1',
            );
            const activeAuthCodes = new Set(result.rows.map((row) => row.auth_code));

            if (!this.restarting) {
                for (const authCode of activeAuthCodes) {
                    this.enqueueStart(authCode);
                }
            }

            for (const [authCode, client] of this.collectors.entries()) {
                if (!activeAuthCodes.has(authCode)) {
                    logger.info({ auth: authCode.slice(0, 8) }, 'Stopping collector');
                    client.close();
                    this.collectors.delete(authCode);
                }
            }
        } catch (error) {
            logger.error({ error }, 'Failed to sync broadcasters');
        }
    }

    private enqueueStart(authCode: string) {
        if (this.stopped) return;
        if (this.collectors.has(authCode)) return;
        if (this.starting.has(authCode)) return;
        if (this.queuedStarts.has(authCode)) return;

        const cooldownUntil = this.authStartCooldownUntil.get(authCode) ?? 0;
        if (cooldownUntil > Date.now()) return;

        this.queuedStarts.add(authCode);
        this.startQueue.push(authCode);
        void this.processStartQueue();
    }

    private async processStartQueue() {
        if (this.startQueueRunning) return;

        this.startQueueRunning = true;
        try {
            while (!this.stopped && this.startQueue.length > 0) {
                const cooldownMs = this.globalStartCooldownUntil - Date.now();
                if (cooldownMs > 0) {
                    logger.warn({
                        cooldownMs,
                        queued: this.startQueue.length,
                    }, 'Start queue paused after Bilibili access limit');
                    await sleep(cooldownMs);
                    continue;
                }

                const authCode = this.startQueue.shift();
                if (!authCode) continue;

                this.queuedStarts.delete(authCode);
                await this.startCollector(authCode);

                if (!this.stopped && this.startQueue.length > 0) {
                    await sleep(START_SPACING_MS);
                }
            }
        } finally {
            this.startQueueRunning = false;
            if (!this.stopped && this.startQueue.length > 0) {
                void this.processStartQueue();
            }
        }
    }

    private async startCollector(authCode: string) {
        if (this.stopped) return;
        if (this.collectors.has(authCode) || this.starting.has(authCode)) return;

        this.starting.add(authCode);
        logger.info({ auth: authCode.slice(0, 8) }, 'Starting collector');

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
            this.authStartCooldownUntil.delete(authCode);
        } catch (error) {
            logger.error({ error, auth: authCode.slice(0, 8) }, 'Collector start failed');
            await this.handleStartFailure(authCode, error);
            client.close();
        } finally {
            this.starting.delete(authCode);
        }
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

        logger.warn({
            auth: authCode.slice(0, 8),
            reason: info.reason,
            failures: info.failures,
        }, 'Collector unhealthy; restarting');

        client.close();
        this.collectors.delete(authCode);
        this.enqueueStart(authCode);
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
            return;
        }

        if (!isAuthCodeInvalidError(error)) return;

        const failures = (this.startFailures.get(authCode) ?? 0) + 1;
        this.startFailures.set(authCode, failures);

        logger.warn({
            auth: authCode.slice(0, 8),
            failures,
        }, 'Auth code validation failed');

        if (failures < 5) return;

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

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
