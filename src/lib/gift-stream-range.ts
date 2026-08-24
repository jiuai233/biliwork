/** Calendar helpers in Asia/Shanghai. Gift stream `end_date` cannot be today. */

const SHANGHAI = 'Asia/Shanghai';

export type MonthRange = { begin: string; end: string };

export type GiftStreamItem = {
    uid: number;
    uname: string;
    time: string;
    goods_id: number;
    gift_id: number;
    name: string;
    num: number;
    hamster: number;
    receive_title: string;
    room_id: number;
};

export function shanghaiYmd(date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: SHANGHAI,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    return `${year}${month}${day}`;
}

export function addCalendarDays(ymd: string, days: number): string {
    const year = Number(ymd.slice(0, 4));
    const month = Number(ymd.slice(4, 6));
    const day = Number(ymd.slice(6, 8));
    const utc = new Date(Date.UTC(year, month - 1, day + days));
    const nextYear = utc.getUTCFullYear();
    const nextMonth = String(utc.getUTCMonth() + 1).padStart(2, '0');
    const nextDay = String(utc.getUTCDate()).padStart(2, '0');
    return `${nextYear}${nextMonth}${nextDay}`;
}

export function yesterdayShanghaiYmd(now = new Date()): string {
    return addCalendarDays(shanghaiYmd(now), -1);
}

export function yearStartShanghaiYmd(now = new Date()): string {
    return `${shanghaiYmd(now).slice(0, 4)}0101`;
}

export function lastDayOfMonth(ymd: string): string {
    const year = Number(ymd.slice(0, 4));
    const month = Number(ymd.slice(4, 6));
    const utc = new Date(Date.UTC(year, month, 0));
    const nextYear = utc.getUTCFullYear();
    const nextMonth = String(utc.getUTCMonth() + 1).padStart(2, '0');
    const nextDay = String(utc.getUTCDate()).padStart(2, '0');
    return `${nextYear}${nextMonth}${nextDay}`;
}

export function minYmd(a: string, b: string): string {
    return a <= b ? a : b;
}

export function maxYmd(a: string, b: string): string {
    return a >= b ? a : b;
}

/** Jan 1 of the current Shanghai year through yesterday. */
export function defaultGiftStreamRange(now = new Date()): MonthRange {
    return {
        begin: yearStartShanghaiYmd(now),
        end: yesterdayShanghaiYmd(now),
    };
}

export function splitMonthRanges(begin: string, end: string): MonthRange[] {
    if (!/^\d{8}$/.test(begin) || !/^\d{8}$/.test(end) || begin > end) {
        return [];
    }

    const ranges: MonthRange[] = [];
    let cursor = begin;
    while (cursor <= end) {
        const monthEnd = minYmd(lastDayOfMonth(cursor), end);
        ranges.push({ begin: cursor, end: monthEnd });
        cursor = addCalendarDays(monthEnd, 1);
    }
    return ranges;
}

export function giftStreamUniqueKey(item: Pick<GiftStreamItem, 'time' | 'gift_id' | 'uid' | 'num' | 'hamster'>): string {
    return `${item.time}|${item.gift_id}|${item.uid}|${item.num}|${item.hamster}`;
}

export function dedupeGiftItems(items: GiftStreamItem[]): GiftStreamItem[] {
    const seen = new Set<string>();
    const unique: GiftStreamItem[] = [];
    for (const item of items) {
        const key = giftStreamUniqueKey(item);
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
    }
    return unique;
}

/** Parse "YYYY-MM-DD HH:mm:ss" as Asia/Shanghai epoch ms. */
export function giftTimeToTs(time: string): number | null {
    const match = time.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return null;
    const [, year, month, day, hour, minute, second] = match;
    const ms = Date.parse(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`);
    return Number.isNaN(ms) ? null : ms;
}

export const GIFT_STREAM_RETENTION_DAYS = 180;
