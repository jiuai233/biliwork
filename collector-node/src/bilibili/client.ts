import { createHash, createHmac } from 'node:crypto';
import { brotliDecompressSync, inflateSync } from 'node:zlib';
import WebSocket from 'ws';
import { logger } from '../logger.js';
import {
    parseDanmaku,
    parseGift,
    parseGuard,
    parseLiveStatus,
    parseSuperChat,
    type DanmakuMessage,
    type GiftMessage,
    type GuardMessage,
    type LiveStatusMessage,
    type SuperChatMessage,
} from './messages.js';

const START_URL = 'https://live-open.biliapi.com/v2/app/start';
const HEARTBEAT_URL = 'https://live-open.biliapi.com/v2/app/heartbeat';

const HEARTBEAT_INTERVAL_MS = 20_000;
const GAME_HEARTBEAT_FAILURE_LIMIT = 5;
const REQUEST_TIMEOUT_MS = 15_000;
const WS_CONNECT_TIMEOUT_MS = 10_000;

const OP_HEARTBEAT = 2;
const OP_MESSAGE = 5;
const OP_AUTH = 7;
const OP_AUTH_REPLY = 8;

interface StartResponse {
    code: number;
    message?: string;
    data: {
        game_info: { game_id: string };
        websocket_info: { auth_body: string; wss_link: string[] };
        anchor_info: {
            room_id: number;
            uid: number;
            uname: string;
            uface: string;
            open_id: string;
        };
    };
}

interface HeartbeatResponse {
    code: number;
    message?: string;
}

export interface AnchorInfo {
    roomId: number;
    uid: number;
    uname: string;
    uface: string;
    openId: string;
}

export type ClientUnhealthyReason =
    | 'game_heartbeat_failed'
    | 'ws_closed'
    | 'ws_heartbeat_not_open'
    | 'ws_heartbeat_failed';

export interface ClientUnhealthyInfo {
    reason: ClientUnhealthyReason;
    failures?: number;
    error?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function connectWebSocket(url: string, timeoutMs: number): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        let settled = false;

        const finish = (error?: Error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            ws.removeListener('open', onOpen);
            ws.removeListener('error', onError);
            if (error) {
                ws.terminate();
                reject(error);
                return;
            }
            resolve(ws);
        };

        const timer = setTimeout(() => {
            finish(new Error(`WS connect timeout after ${timeoutMs}ms`));
        }, timeoutMs);

        const onOpen = () => finish();
        const onError = (error: Error) => finish(error);

        ws.once('open', onOpen);
        ws.once('error', onError);
    });
}

export class BilibiliClient {
    private gameId = '';
    private authBody = '';
    private wssLinks: string[] = [];
    private ws?: WebSocket;
    private wsHeartbeatTimer?: NodeJS.Timeout;
    private gameHeartbeatTimer?: NodeJS.Timeout;
    private gameHeartbeatFailures = 0;
    private gameHeartbeatInFlight = false;
    private closed = false;
    private unhealthyNotified = false;
    private log;

    onDanmaku?: (msg: DanmakuMessage) => void | Promise<void>;
    onGift?: (msg: GiftMessage) => void | Promise<void>;
    onGuard?: (msg: GuardMessage) => void | Promise<void>;
    onSuperChat?: (msg: SuperChatMessage) => void | Promise<void>;
    onLiveStatus?: (msg: LiveStatusMessage) => void | Promise<void>;
    onStarted?: (info: AnchorInfo) => void | Promise<void>;
    onUnhealthy?: (info: ClientUnhealthyInfo) => void | Promise<void>;

    constructor(
        private accessKeyId: string,
        private accessKeySecret: string,
        private appId: number,
        private authCode: string,
    ) {
        this.log = logger.child({ auth: authCode.slice(0, 8) });
    }

    async start() {
        await this.startGame();
        await this.connectWs();
    }

    close() {
        if (this.closed) return;

        this.closed = true;
        if (this.wsHeartbeatTimer) clearInterval(this.wsHeartbeatTimer);
        if (this.gameHeartbeatTimer) clearInterval(this.gameHeartbeatTimer);
        this.ws?.close();
        this.log.info('Client closed');
    }

    private async startGame() {
        const response = await this.signedRequest<StartResponse>(START_URL, {
            code: this.authCode,
            app_id: this.appId,
        });

        if (response.code !== 0) {
            throw new Error(`start_game api error: ${JSON.stringify(response)}`);
        }

        this.gameId = response.data.game_info.game_id;
        this.authBody = response.data.websocket_info.auth_body;
        this.wssLinks = response.data.websocket_info.wss_link;

        this.log.info({
            room: response.data.anchor_info.room_id,
            uname: response.data.anchor_info.uname,
        }, 'Game started');

        void this.onStarted?.({
            roomId: response.data.anchor_info.room_id,
            uid: response.data.anchor_info.uid,
            uname: response.data.anchor_info.uname,
            uface: response.data.anchor_info.uface,
            openId: response.data.anchor_info.open_id,
        });
    }

    private async connectWs() {
        let lastError: unknown;

        for (const url of this.wssLinks) {
            try {
                this.ws = await connectWebSocket(url, WS_CONNECT_TIMEOUT_MS);
                break;
            } catch (error) {
                lastError = error;
                this.log.warn({ error, url }, 'WS connect failed');
            }
        }

        if (!this.ws) {
            throw new Error(`all WS endpoints failed: ${String(lastError)}`);
        }

        this.ws.on('message', (data) => {
            const buffer = Buffer.isBuffer(data)
                ? data
                : Array.isArray(data)
                    ? Buffer.concat(data)
                    : Buffer.from(data);
            this.handlePacket(buffer);
        });
        this.ws.on('error', (error) => this.log.error({ error }, 'WS error'));
        this.ws.on('close', (code, reason) => {
            if (!this.closed) {
                this.log.warn({
                    code,
                    reason: reason.toString('utf8'),
                }, 'WS closed');
                this.markUnhealthy('ws_closed');
            }
        });

        this.sendPacket(Buffer.from(this.authBody), OP_AUTH);

        this.wsHeartbeatTimer = setInterval(() => {
            try {
                if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                    this.markUnhealthy('ws_heartbeat_not_open');
                    return;
                }
                this.sendPacket(Buffer.alloc(0), OP_HEARTBEAT);
            } catch (error) {
                this.log.error({ error }, 'WS heartbeat failed');
                this.markUnhealthy('ws_heartbeat_failed', error);
            }
        }, HEARTBEAT_INTERVAL_MS);

        this.gameHeartbeatTimer = setInterval(() => {
            void this.sendGameHeartbeat();
        }, HEARTBEAT_INTERVAL_MS);
    }

    private async sendGameHeartbeat() {
        if (this.closed || this.gameHeartbeatInFlight) return;

        this.gameHeartbeatInFlight = true;
        try {
            const response = await this.signedRequest<HeartbeatResponse>(HEARTBEAT_URL, { game_id: this.gameId });
            if (response.code !== 0) {
                throw new Error(`heartbeat api error: ${JSON.stringify(response)}`);
            }
            if (this.closed) return;
            if (this.gameHeartbeatFailures > 0) {
                this.log.info({ failures: this.gameHeartbeatFailures }, 'Game heartbeat recovered');
            }
            this.gameHeartbeatFailures = 0;
        } catch (error) {
            if (this.closed) return;

            this.gameHeartbeatFailures += 1;
            const failures = this.gameHeartbeatFailures;

            this.log.warn({
                error,
                failures,
                limit: GAME_HEARTBEAT_FAILURE_LIMIT,
            }, 'Game heartbeat failed');

            if (failures >= GAME_HEARTBEAT_FAILURE_LIMIT) {
                this.markUnhealthy('game_heartbeat_failed', error, failures);
            }
        } finally {
            this.gameHeartbeatInFlight = false;
        }
    }

    private markUnhealthy(reason: ClientUnhealthyReason, error?: unknown, failures?: number) {
        if (this.closed || this.unhealthyNotified) return;

        this.unhealthyNotified = true;
        this.log.warn({ reason, error, failures }, 'Client unhealthy');
        this.close();
        Promise.resolve(this.onUnhealthy?.({ reason, error, failures }))
            .catch((callbackError) => {
                this.log.error({
                    error: callbackError,
                    reason,
                }, 'Client unhealthy callback failed');
            });
    }

    private sendPacket(body: Buffer, op: number) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const header = Buffer.alloc(16);
        header.writeUInt32BE(16 + body.length, 0);
        header.writeUInt16BE(16, 4);
        header.writeUInt16BE(1, 6);
        header.writeUInt32BE(op, 8);
        header.writeUInt32BE(1, 12);
        this.ws.send(Buffer.concat([header, body]));
    }

    private handlePacket(data: Buffer) {
        let offset = 0;
        while (offset + 16 <= data.length) {
            const packetLength = data.readUInt32BE(offset);
            const headerLength = data.readUInt16BE(offset + 4);
            const version = data.readUInt16BE(offset + 6);
            const op = data.readUInt32BE(offset + 8);

            if (packetLength <= 0 || offset + packetLength > data.length) break;

            const body = data.subarray(offset + headerLength, offset + packetLength);

            if (op === OP_MESSAGE) {
                try {
                    if (version === 2) {
                        this.handlePacket(inflateSync(body));
                    } else if (version === 3) {
                        this.handlePacket(brotliDecompressSync(body));
                    } else {
                        this.dispatchMessage(body);
                    }
                } catch (error) {
                    this.log.warn({ error, version }, 'Failed to decode WS packet');
                }
            } else if (op === OP_AUTH_REPLY) {
                this.log.info('WS auth success');
            }

            offset += packetLength;
        }
    }

    private dispatchMessage(body: Buffer) {
        let payload: unknown;
        try {
            payload = JSON.parse(body.toString('utf8'));
        } catch {
            return;
        }

        const message = asRecord(payload);
        const cmd = typeof message.cmd === 'string' ? message.cmd : '';
        const data = asRecord(message.data);

        switch (cmd) {
            case 'LIVE_OPEN_PLATFORM_DM':
                void this.onDanmaku?.(parseDanmaku(data));
                break;
            case 'LIVE_OPEN_PLATFORM_SEND_GIFT':
                void this.onGift?.(parseGift(data));
                break;
            case 'LIVE_OPEN_PLATFORM_GUARD':
                void this.onGuard?.(parseGuard(data));
                break;
            case 'LIVE_OPEN_PLATFORM_SUPER_CHAT':
                void this.onSuperChat?.(parseSuperChat(data));
                break;
            case 'LIVE_OPEN_PLATFORM_LIVE':
            case 'LIVE_OPEN_PLATFORM_LIVE_START':
                void this.onLiveStatus?.(parseLiveStatus(data, true));
                break;
            case 'LIVE_OPEN_PLATFORM_END':
            case 'LIVE_OPEN_PLATFORM_LIVE_END':
                void this.onLiveStatus?.(parseLiveStatus(data, false));
                break;
        }
    }

    private async signedRequest<T = Record<string, unknown>>(url: string, payload: Record<string, unknown>): Promise<T> {
        const body = JSON.stringify(payload);
        const contentMd5 = createHash('md5').update(body).digest('hex');
        const timestamp = Math.floor(Date.now() / 1000);
        const nonce = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;

        const headerString = [
            `x-bili-accesskeyid:${this.accessKeyId}`,
            `x-bili-content-md5:${contentMd5}`,
            'x-bili-signature-method:HMAC-SHA256',
            `x-bili-signature-nonce:${nonce}`,
            'x-bili-signature-version:1.0',
            `x-bili-timestamp:${timestamp}`,
        ].join('\n');

        const signature = createHmac('sha256', this.accessKeySecret)
            .update(headerString)
            .digest('hex');

        const response = await fetch(url, {
            method: 'POST',
            body,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            headers: {
                'Authorization': signature,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-bili-accesskeyid': this.accessKeyId,
                'x-bili-content-md5': contentMd5,
                'x-bili-signature-method': 'HMAC-SHA256',
                'x-bili-signature-nonce': nonce,
                'x-bili-signature-version': '1.0',
                'x-bili-timestamp': String(timestamp),
            },
        });

        if (!response.ok) {
            throw new Error(`Bilibili API ${url} returned ${response.status}`);
        }

        return await response.json() as T;
    }
}
