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

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export class BilibiliClient {
    private gameId = '';
    private authBody = '';
    private wssLinks: string[] = [];
    private ws?: WebSocket;
    private wsHeartbeatTimer?: NodeJS.Timeout;
    private gameHeartbeatTimer?: NodeJS.Timeout;
    private closed = false;
    private log;

    onDanmaku?: (msg: DanmakuMessage) => void | Promise<void>;
    onGift?: (msg: GiftMessage) => void | Promise<void>;
    onGuard?: (msg: GuardMessage) => void | Promise<void>;
    onSuperChat?: (msg: SuperChatMessage) => void | Promise<void>;
    onLiveStatus?: (msg: LiveStatusMessage) => void | Promise<void>;

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
    }

    private async connectWs() {
        let lastError: unknown;

        for (const url of this.wssLinks) {
            try {
                this.ws = await new Promise<WebSocket>((resolve, reject) => {
                    const ws = new WebSocket(url);
                    ws.once('open', () => resolve(ws));
                    ws.once('error', reject);
                });
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
        this.ws.on('close', () => {
            if (!this.closed) {
                this.log.warn('WS closed');
            }
        });

        this.sendPacket(Buffer.from(this.authBody), OP_AUTH);

        this.wsHeartbeatTimer = setInterval(() => {
            try {
                this.sendPacket(Buffer.alloc(0), OP_HEARTBEAT);
            } catch (error) {
                this.log.error({ error }, 'WS heartbeat failed');
            }
        }, 20_000);

        this.gameHeartbeatTimer = setInterval(() => {
            this.signedRequest(HEARTBEAT_URL, { game_id: this.gameId })
                .catch((error) => this.log.warn({ error }, 'Game heartbeat failed'));
        }, 20_000);
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
