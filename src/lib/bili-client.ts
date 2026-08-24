import { cookiePairsFromHeaders, parseCookieMap } from './bili-cookie';
import {
    dedupeGiftItems,
    giftStreamUniqueKey,
    type GiftStreamItem,
} from './gift-stream-range';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const QR_GENERATE = 'https://passport.bilibili.com/x/passport-login/web/qrcode/generate';
const QR_POLL = 'https://passport.bilibili.com/x/passport-login/web/qrcode/poll';
const GIFT_STREAM = 'https://api.live.bilibili.com/xlive/revenue/v1/giftStream/getReceivedGiftStream';

export const BILI_QR_NOT_SCANNED = 86101;
export const BILI_QR_SCANNED = 86090;
export const BILI_QR_EXPIRED = 86038;

type FetchLike = typeof fetch;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateBiliQr(fetchImpl: FetchLike = fetch): Promise<{ url: string; qrcodeKey: string }> {
    const response = await fetchImpl(QR_GENERATE, {
        headers: { 'user-agent': UA, accept: 'application/json' },
    });
    const payload = (await response.json()) as { code: number; data?: { url: string; qrcode_key: string } };
    if (payload.code !== 0 || !payload.data?.url || !payload.data.qrcode_key) {
        throw new Error('无法向 B 站请求登录二维码');
    }
    return { url: payload.data.url, qrcodeKey: payload.data.qrcode_key };
}

export type BiliQrPollResult =
    | { phase: 'pending' | 'scanned' | 'expired'; code: number; message: string }
    | { phase: 'success'; code: 0; message: string; cookie: string; uid: number };

export async function fetchBiliProfile(cookie: string, uid: number, fetchImpl: FetchLike = fetch): Promise<{
    uname?: string;
    uface?: string;
    roomId?: number;
}> {
    const headers = { 'user-agent': UA, cookie, accept: 'application/json' };
    const profile: { uname?: string; uface?: string; roomId?: number } = {};
    try {
        const navRes = await fetchImpl('https://api.bilibili.com/x/web-interface/nav', { headers });
        const nav = (await navRes.json()) as { data?: { uname?: string; face?: string } };
        if (nav.data?.uname) profile.uname = nav.data.uname;
        if (nav.data?.face) profile.uface = nav.data.face;
    } catch {
        // 资料失败不阻断扫码
    }
    try {
        const roomRes = await fetchImpl(`https://api.live.bilibili.com/live_user/v1/Master/info?uid=${uid}`, { headers });
        const room = (await roomRes.json()) as { data?: { room_id?: number } };
        const roomId = Number(room.data?.room_id) || 0;
        if (roomId > 0) profile.roomId = roomId;
    } catch {
        // 直播间失败不阻断扫码
    }
    return profile;
}

export async function pollBiliQr(qrcodeKey: string, fetchImpl: FetchLike = fetch): Promise<BiliQrPollResult> {
    const response = await fetchImpl(`${QR_POLL}?qrcode_key=${encodeURIComponent(qrcodeKey)}`, {
        headers: { 'user-agent': UA, accept: 'application/json' },
    });
    const payload = (await response.json()) as {
        code: number;
        data?: { code: number; message?: string };
    };
    const dataCode = payload.data?.code ?? payload.code;
    const message = payload.data?.message || '';

    if (payload.code === 0 && dataCode === 0) {
        const cookies = cookiePairsFromHeaders(response.headers);
        if (cookies.length === 0) {
            throw new Error('扫码成功，但响应头中未读取到 Cookie');
        }
        const cookie = cookies.join('; ');
        const uid = Number(parseCookieMap(cookie).DedeUserID || 0);
        if (!uid) {
            throw new Error('扫码成功，但 Cookie 中没有 DedeUserID');
        }
        return { phase: 'success', code: 0, message: '扫码成功', cookie, uid };
    }

    if (dataCode === BILI_QR_SCANNED) {
        return { phase: 'scanned', code: dataCode, message: message || '已扫码，请在手机上确认' };
    }
    if (dataCode === BILI_QR_EXPIRED) {
        return { phase: 'expired', code: dataCode, message: message || '二维码已过期' };
    }
    return { phase: 'pending', code: dataCode, message: message || '等待扫码' };
}

type GiftStreamPage = {
    total_page: number;
    total_count: number;
    list: GiftStreamItem[];
};

function asGiftItem(raw: Record<string, unknown>): GiftStreamItem {
    return {
        uid: Number(raw.uid) || 0,
        uname: String(raw.uname ?? ''),
        time: String(raw.time ?? ''),
        goods_id: Number(raw.goods_id) || 0,
        gift_id: Number(raw.gift_id) || 0,
        name: String(raw.name ?? ''),
        num: Number(raw.num) || 1,
        hamster: Number(raw.hamster) || 0,
        receive_title: String(raw.receive_title ?? ''),
        room_id: Number(raw.room_id) || 0,
    };
}

export async function postGiftStreamPage(options: {
    cookie: string;
    begin: string;
    end: string;
    page: number;
    fetchImpl?: FetchLike;
}): Promise<GiftStreamPage> {
    const fetchImpl = options.fetchImpl ?? fetch;
    const cookies = parseCookieMap(options.cookie);
    const jct = cookies.bili_jct;
    if (!jct) {
        throw new Error('Cookie 缺少 bili_jct，登录态可能已失效');
    }

    const body = new URLSearchParams({
        page: String(options.page),
        gift_id: '0',
        begin_date: options.begin,
        end_date: options.end,
        uname: '',
        goods_id: '',
        csrf_token: jct,
        csrf: jct,
    });

    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await fetchImpl(GIFT_STREAM, {
                method: 'POST',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'user-agent': UA,
                    referer: 'https://link.bilibili.com/p/center/index',
                    origin: 'https://link.bilibili.com',
                    cookie: options.cookie,
                    accept: 'application/json, text/plain, */*',
                },
                body,
                redirect: 'follow',
            });
            if (response.status === 412 || response.status === 401) {
                throw new Error(`auth/风控 failed http ${response.status}`);
            }
            const json = (await response.json()) as {
                code: number;
                message?: string;
                msg?: string;
                data?: { total_page?: number; total_count?: number; list?: Record<string, unknown>[] };
            };
            if (json.code !== 0) {
                throw new Error(`api code=${json.code} msg=${json.message || json.msg || ''}`);
            }
            const list = (json.data?.list ?? []).map(asGiftItem);
            return {
                total_page: Number(json.data?.total_page) || 0,
                total_count: Number(json.data?.total_count) || 0,
                list,
            };
        } catch (error) {
            lastError = error;
            if (attempt === 2) break;
            await sleep(1500 * (attempt + 1));
        }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export type FetchedGiftMonth = {
    begin: string;
    end: string;
    totalPage: number;
    totalCount: number;
    rawCount: number;
    unique: GiftStreamItem[];
};

export async function fetchGiftStreamMonth(options: {
    cookie: string;
    begin: string;
    end: string;
    fetchImpl?: FetchLike;
    delayMs?: number;
}): Promise<FetchedGiftMonth> {
    const delayMs = options.delayMs ?? 300;
    let probe = await postGiftStreamPage({ ...options, page: 0 });
    if (probe.total_count === 0 && delayMs > 0) {
        await sleep(1500);
        probe = await postGiftStreamPage({ ...options, page: 0 });
    }

    const collected: GiftStreamItem[] = [...probe.list];
    const totalPage = probe.total_page;

    for (let page = 1; page < totalPage; page++) {
        let list: GiftStreamItem[] = [];
        for (let attempt = 0; attempt < 3; attempt++) {
            const result = await postGiftStreamPage({ ...options, page });
            list = result.list;
            if (list.length > 0) break;
            if (delayMs > 0) await sleep(1500 * (attempt + 1));
            else break;
        }
        collected.push(...list);
        if (delayMs > 0) await sleep(delayMs);
    }

    return {
        begin: options.begin,
        end: options.end,
        totalPage,
        totalCount: probe.total_count,
        rawCount: collected.length,
        unique: dedupeGiftItems(collected),
    };
}

export { giftStreamUniqueKey };
