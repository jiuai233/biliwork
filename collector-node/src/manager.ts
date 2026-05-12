import { env } from './config.js';
import { pool } from './db.js';
import { logger } from './logger.js';
import { BilibiliClient } from './bilibili/client.js';
import { saveDanmaku, saveGift, saveGuard, saveLiveStatus, saveSuperChat } from './repositories/events.js';

export class CollectorManager {
    private collectors = new Map<string, BilibiliClient>();
    private starting = new Set<string>();
    private startFailures = new Map<string, number>();
    private timer?: NodeJS.Timeout;
    private stopped = false;

    start() {
        logger.info('Collector Manager started');
        void this.syncBroadcasters();
        this.timer = setInterval(() => {
            void this.syncBroadcasters();
        }, 10_000);
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
        this.startFailures.clear();
    }

    async restartAll() {
        logger.info('Scheduled restart: refreshing all collectors');
        const authCodes = Array.from(this.collectors.keys());

        for (const authCode of authCodes) {
            const client = this.collectors.get(authCode);
            if (client) {
                logger.info({ auth: authCode.slice(0, 8) }, 'Restarting collector');
                client.close();
                this.collectors.delete(authCode);
            }

            await sleep(2_000);
            void this.startCollector(authCode);
            await sleep(3_000);
        }

        logger.info('Scheduled restart completed');
    }

    private async syncBroadcasters() {
        if (this.stopped) return;

        try {
            const result = await pool.query<{ auth_code: string }>(
                'SELECT auth_code FROM broadcasters WHERE active = 1',
            );
            const activeAuthCodes = new Set(result.rows.map((row) => row.auth_code));

            for (const authCode of activeAuthCodes) {
                if (!this.collectors.has(authCode) && !this.starting.has(authCode)) {
                    void this.startCollector(authCode);
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

    private async startCollector(authCode: string) {
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

        try {
            await client.start();
            if (this.stopped) {
                client.close();
                return;
            }
            this.collectors.set(authCode, client);
            this.startFailures.delete(authCode);
        } catch (error) {
            logger.error({ error, auth: authCode.slice(0, 8) }, 'Collector start failed');
            await this.handleStartFailure(authCode, error);
            client.close();
        } finally {
            this.starting.delete(authCode);
        }
    }

    private async handleStartFailure(authCode: string, error: unknown) {
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

function isAuthCodeInvalidError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('start_game api error')) return false;

    return /身份码|验证码|code|auth|invalid|expired|expire|无效|失效|不存在|错误|过期/i.test(message);
}
