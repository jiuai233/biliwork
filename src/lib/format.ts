import { format } from "date-fns";

/** Bilibili avatar URLs may be protocol-relative or http; CDN requires https. */
export function normalizeAvatarSrc(src: string | null | undefined): string | undefined {
    if (!src) return undefined;
    if (src.startsWith("//")) return `https:${src}`;
    if (src.startsWith("http://")) return src.replace(/^http:\/\//, "https://");
    return src;
}

export function formatDateTime(ts: number | null | undefined): string {
    if (!ts) return "-";
    return format(new Date(ts), "MM-dd HH:mm");
}

export function formatDuration(minutes: number, fallback = "进行中"): string {
    if (minutes <= 0) return fallback;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** CNY display: ¥ prefix, thousands separator, up to 1 decimal (trailing .0 trimmed). */
export function formatCurrency(amount: number): string {
    const rounded = Math.round(amount * 10) / 10;
    return `¥${rounded.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}`;
}

export type ParsedCountContent = {
    name: string;
    count: number;
    suffix: string;
};

/** Parses transaction content like "小花花 x3 (盲盒)" into name/count/suffix. */
export function parseCountContent(content: string): ParsedCountContent {
    const match = content.match(/^(.*?) x(\d+)(.*)$/);
    return {
        name: match ? match[1].trim() : content.trim(),
        count: match ? Number(match[2]) : 1,
        suffix: match ? match[3] : "",
    };
}
