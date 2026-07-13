import type { CSSProperties } from "react";

export const BILI_CARD_WIDTH = 500;
export const BILI_GIFT_CARD_HEIGHT = 80;
export const BILI_CARD_GAP = 16;

export type BiliTransactionType = "gift" | "super_chat" | "guard";

export interface BiliTransactionCardData {
    id: string;
    type: BiliTransactionType;
    uname: string;
    uface: string;
    content: string;
    price: number;
    icon?: string;
    guardLevel?: number;
}

export type BiliCardSize = "board" | "overlay";

const SIZE = {
    board: {
        scHeaderPadding: "10px 16px",
        scBodyPadding: "14px 16px",
        scAvatar: 42,
        scNameFont: 16,
        scPriceFont: 18,
        scBodyFont: 16,
        giftHeight: BILI_GIFT_CARD_HEIGHT,
        giftAvatar: 48,
        giftNameFont: 16,
        giftSubFont: 14,
        giftIcon: 44,
        priceFont: 20,
    },
    overlay: {
        scHeaderPadding: "8px 14px",
        scBodyPadding: "12px 14px",
        scAvatar: 36,
        scNameFont: 14,
        scPriceFont: 16,
        scBodyFont: 14,
        giftHeight: BILI_GIFT_CARD_HEIGHT,
        giftAvatar: 42,
        giftNameFont: 14,
        giftSubFont: 12,
        giftIcon: 38,
        priceFont: 17,
    },
} as const;

export function getCardMetrics(size: BiliCardSize) {
    return SIZE[size];
}

/** Price tier shared by card styles and theme CSS hooks (.biweb-tier-N). */
export function getGiftTier(price: number) {
    if (price < 10) return 0;
    if (price < 30) return 1;
    if (price < 100) return 2;
    if (price < 500) return 3;
    return 4;
}

function hexToRgba(hex: string, alpha: number) {
    const value = parseInt(hex.slice(1), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function gradient(from: string, to: string, alpha: number) {
    return `linear-gradient(135deg, ${hexToRgba(from, alpha)} 0%, ${hexToRgba(to, alpha)} 100%)`;
}

const TIER_GRADIENTS: [string, string][] = [
    ["#3f3f46", "#27272a"],
    ["#2563eb", "#1d4ed8"],
    ["#7c3aed", "#6d28d9"],
    ["#db2777", "#be185d"],
    ["#f59e0b", "#d97706"],
];

/** Flat tier colors, blivechat/YouTube paid-message style. Alpha < 1 for translucent overlay cards. */
export function getGiftPriceStyle(price: number, alpha = 1): CSSProperties {
    const [from, to] = TIER_GRADIENTS[getGiftTier(price)];
    return { background: gradient(from, to, alpha) };
}

/** Bilibili SC price tiers styled after YouTube paid messages (LAPLACE Chat look). */
const SC_TIERS = [
    { min: 2000, header: "#ffcdd2", body: "#d32f2f", bodyText: "#ffffff" },
    { min: 1000, header: "#f8bbd0", body: "#e91e63", bodyText: "#ffffff" },
    { min: 500, header: "#ffe0b2", body: "#f57c00", bodyText: "#ffffff" },
    { min: 100, header: "#ffecb3", body: "#ffb300", bodyText: "#212121" },
    { min: 50, header: "#b2ebf2", body: "#00b8d4", bodyText: "#ffffff" },
    { min: 0, header: "#cfe4fd", body: "#1565c0", bodyText: "#ffffff" },
] as const;

export function getSCColors(price: number, alpha = 1) {
    const tier = SC_TIERS.find((entry) => price >= entry.min) ?? SC_TIERS[SC_TIERS.length - 1];
    return {
        headerBg: hexToRgba(tier.header, alpha),
        bodyBg: hexToRgba(tier.body, alpha),
        bodyText: tier.bodyText,
        nameText: "rgba(0, 0, 0, 0.54)",
        priceText: "#0f0f0f",
    };
}

/** Official Bilibili guard artwork lives in /public. */
export function getGuardTheme(level?: number, alpha = 1) {
    switch (level) {
        case 1:
            return {
                gradient: gradient("#f59e0b", "#d97706", alpha),
                label: "总督",
                icon: "/zongdu.png",
                border: "/zongduborder.png",
            };
        case 2:
            return {
                gradient: gradient("#9333ea", "#7e22ce", alpha),
                label: "提督",
                icon: "/tidu.png",
                border: "/tiduborder.png",
            };
        default:
            return {
                gradient: gradient("#2563eb", "#1d4ed8", alpha),
                label: "舰长",
                icon: "/jianzhang.png",
                border: "/jianzhangboder.png",
            };
    }
}
