import { parseCookieMap } from '../biliCookie.js';
import { dedupeGiftItems, type GiftStreamItem } from '../giftStreamRange.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const GIFT_STREAM = 'https://api.live.bilibili.com/xlive/revenue/v1/giftStream/getReceivedGiftStream';

type FetchLike = typeof fetch;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    // 整月偶发 total_count=0，不能当成没数据。
    if (probe.total_count === 0 && delayMs > 0) {
        const emptyRetryDelay = delayMs >= 300 ? 1500 : delayMs;
        for (let attempt = 1; attempt <= 3 && probe.total_count === 0; attempt++) {
            await sleep(emptyRetryDelay * attempt);
            probe = await postGiftStreamPage({ ...options, page: 0 });
        }
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
