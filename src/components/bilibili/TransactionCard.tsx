"use client";

import type { CSSProperties } from "react";
import { X } from "lucide-react";
import {
    BILI_CARD_GAP,
    BILI_CARD_WIDTH,
    BILI_GIFT_CARD_HEIGHT,
    getCardMetrics,
    getGiftPriceStyle,
    getGiftTier,
    getGuardTheme,
    getSCColors,
    type BiliCardSize,
    type BiliTransactionCardData,
} from "@/lib/bilibili-cards";
import { formatCurrency, parseCountContent } from "@/lib/format";

interface TransactionCardProps {
    transaction: BiliTransactionCardData;
    size?: BiliCardSize;
    onRemove?: (id: string) => void;
    className?: string;
    style?: CSSProperties;
    "data-board-card"?: boolean;
}

function UserAvatar({
    src,
    name,
    size,
    frameSrc,
}: {
    src?: string;
    name: string;
    size: number;
    /** Official guard frame artwork drawn around the avatar. */
    frameSrc?: string;
}) {
    const frameInset = Math.round(size * 0.14);

    return (
        <div style={{ position: "relative", flexShrink: 0 }}>
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    border: frameSrc ? "none" : "2px solid rgba(255,255,255,0.85)",
                    overflow: "hidden",
                    backgroundColor: "#27272a",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                }}
            >
                {src ? (
                    <img
                        src={src}
                        alt={name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            background: "#3f3f46",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#a1a1aa",
                            fontSize: size * 0.3,
                            fontWeight: "bold",
                        }}
                    >
                        {name?.[0] || "?"}
                    </div>
                )}
            </div>
            {frameSrc && (
                <div
                    style={{
                        position: "absolute",
                        top: -frameInset,
                        left: -frameInset,
                        width: size + frameInset * 2,
                        height: size + frameInset * 2,
                        backgroundImage: `url(${frameSrc})`,
                        backgroundSize: "contain",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        pointerEvents: "none",
                        zIndex: 20,
                    }}
                />
            )}
        </div>
    );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="移除"
            data-html2canvas-ignore="true"
            style={{
                position: "absolute",
                top: "-6px",
                right: "-6px",
                background: "#ef4444",
                border: "2px solid #fff",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 50,
            }}
            className="opacity-0 transition-opacity group-hover:opacity-100"
        >
            <X style={{ width: "12px", height: "12px", color: "white" }} />
        </button>
    );
}

export function TransactionCard({
    transaction,
    size = "board",
    onRemove,
    className,
    style,
    "data-board-card": dataBoardCard,
}: TransactionCardProps) {
    const metrics = getCardMetrics(size);
    const parsed = parseCountContent(transaction.content);
    const giftName = parsed.name;
    const giftNum = parsed.count > 1 || transaction.content.includes(" x") ? String(parsed.count) : "";
    const isGuard = transaction.type === "guard";
    const isSC = transaction.type === "super_chat";
    // Overlay cards are slightly translucent so the stream shows through (LAPLACE style).
    const alpha = size === "overlay" ? 0.85 : 1;
    const guardTheme = isGuard ? getGuardTheme(transaction.guardLevel, alpha) : null;
    const scColors = isSC ? getSCColors(transaction.price, alpha) : null;
    // Stable class hooks on overlay cards (tier / type selectors).
    const hookClasses = [
        "group",
        "biweb-card",
        `biweb-card-${isSC ? "sc" : isGuard ? "guard" : "gift"}`,
        !isSC && `biweb-tier-${getGiftTier(transaction.price)}`,
        className,
    ].filter(Boolean).join(" ");

    if (isSC && scColors) {
        return (
            <div
                data-board-card={dataBoardCard ? true : undefined}
                className={hookClasses}
                style={{
                    width: `${BILI_CARD_WIDTH}px`,
                    maxWidth: "100%",
                    flexShrink: 0,
                    borderRadius: "12px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
                    fontFamily: '"Microsoft YaHei", sans-serif',
                    position: "relative",
                    ...style,
                }}
            >
                {onRemove && <RemoveButton onClick={() => onRemove(transaction.id)} />}
                <div
                    className="biweb-sc-header"
                    style={{
                        backgroundColor: scColors.headerBg,
                        padding: metrics.scHeaderPadding,
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        borderRadius: "12px 12px 0 0",
                    }}
                >
                    <div
                        style={{
                            width: metrics.scAvatar,
                            height: metrics.scAvatar,
                            borderRadius: "50%",
                            overflow: "hidden",
                            flexShrink: 0,
                            backgroundColor: "#ffffff",
                        }}
                    >
                        {transaction.uface ? (
                            <img
                                src={transaction.uface}
                                alt={transaction.uname}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    background: "#e4e4e7",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#71717a",
                                    fontWeight: "bold",
                                }}
                            >
                                {transaction.uname?.[0] || "?"}
                            </div>
                        )}
                    </div>
                    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "1px" }}>
                        <div
                            style={{
                                fontSize: metrics.scNameFont,
                                color: scColors.nameText,
                                fontWeight: 500,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {transaction.uname}
                        </div>
                        <div
                            style={{
                                color: scColors.priceText,
                                fontSize: metrics.scPriceFont,
                                fontWeight: 700,
                                fontVariantNumeric: "tabular-nums",
                            }}
                        >
                            CN¥{transaction.price}
                        </div>
                    </div>
                </div>
                <div
                    className="biweb-sc-body"
                    style={{
                        backgroundColor: scColors.bodyBg,
                        padding: metrics.scBodyPadding,
                        color: scColors.bodyText,
                        fontSize: metrics.scBodyFont,
                        fontWeight: 500,
                        lineHeight: 1.5,
                        borderRadius: "0 0 12px 12px",
                        wordBreak: "break-word",
                    }}
                >
                    {transaction.content}
                </div>
            </div>
        );
    }

    const cardStyle: CSSProperties = isGuard && guardTheme
        ? { background: guardTheme.gradient }
        : getGiftPriceStyle(transaction.price, alpha);

    return (
        <div
            data-board-card={dataBoardCard ? true : undefined}
            className={hookClasses}
            style={{
                width: `${BILI_CARD_WIDTH}px`,
                maxWidth: "100%",
                height: `${metrics.giftHeight}px`,
                display: "flex",
                alignItems: "center",
                gap: size === "board" ? "12px" : "10px",
                padding: size === "board" ? "0 16px" : "0 14px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
                position: "relative",
                flexShrink: 0,
                fontFamily: '"Microsoft YaHei", sans-serif',
                ...cardStyle,
                ...style,
            }}
        >
            {onRemove && <RemoveButton onClick={() => onRemove(transaction.id)} />}
            <UserAvatar
                src={transaction.uface}
                name={transaction.uname}
                size={metrics.giftAvatar}
                frameSrc={guardTheme?.border}
            />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: "2px" }}>
                <div
                    style={{
                        fontSize: metrics.giftNameFont,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.92)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {transaction.uname}
                </div>
                <div
                    style={{
                        fontSize: metrics.giftSubFont,
                        color: "rgba(255,255,255,0.75)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {isGuard ? "开通" : "投喂"}{" "}
                    <span style={{ color: "#ffffff", fontWeight: 700 }}>{giftName}</span>
                    {giftNum && <span style={{ color: "rgba(255,255,255,0.75)" }}> ×{giftNum}</span>}
                </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                {isGuard && guardTheme && (
                    <img
                        src={guardTheme.icon}
                        alt={guardTheme.label}
                        style={{
                            width: metrics.giftIcon,
                            height: metrics.giftIcon,
                            objectFit: "contain",
                            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
                        }}
                    />
                )}
                {transaction.icon && !isGuard && (
                    <img
                        src={transaction.icon}
                        alt={giftName || "礼物"}
                        style={{
                            width: metrics.giftIcon,
                            height: metrics.giftIcon,
                            objectFit: "contain",
                            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
                        }}
                        referrerPolicy="no-referrer"
                    />
                )}
                <div
                    style={{
                        fontSize: metrics.priceFont,
                        fontWeight: 800,
                        color: "#ffffff",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.01em",
                    }}
                >
                    {formatCurrency(transaction.price)}
                </div>
            </div>
        </div>
    );
}

export { BILI_CARD_GAP, BILI_CARD_WIDTH, BILI_GIFT_CARD_HEIGHT };