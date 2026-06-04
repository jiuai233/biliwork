'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

/**
 * OBS 浏览器源 — 实时礼物/SC/舰长 叠加层
 *
 * 独立页面，从 overlay store 读取制作板同步的数据。
 * 短链: /o/[code]  (code = roomId.toString(36))
 *
 * 在 OBS 中：添加浏览器源 → 粘贴此 URL → 宽度 500, 高度 900
 */

interface Transaction {
    id: string;
    type: 'gift' | 'super_chat' | 'guard';
    uname: string;
    uface: string;
    content: string;
    price: number;
    icon?: string;
    guardLevel?: number;
    ts: number;
}

const OVERLAY_CARD_WIDTH = 500;
const OVERLAY_GIFT_CARD_HEIGHT = 80;
const OVERLAY_CARD_GAP = 16;

// SC 颜色
const getSCColors = (price: number) => {
    if (price < 50) return { headerBg: '#e0f7fa', bodyBg: '#00bad0', headerText: '#006064' };
    if (price < 100) return { headerBg: '#e3f2fd', bodyBg: '#4878a6', headerText: '#0d47a1' };
    if (price < 1000) return { headerBg: '#fff9c4', bodyBg: '#e6ac00', headerText: '#f57f17' };
    return { headerBg: '#ffebee', bodyBg: '#d32f2f', headerText: '#b71c1c' };
};

// 礼物价格颜色
const getPriceStyle = (price: number): React.CSSProperties => {
    if (price < 10) return { background: 'linear-gradient(90deg, #3f3f46 0%, #18181b 100%)', borderLeft: '6px solid #a1a1aa' };
    if (price < 30) return { background: 'linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)', borderLeft: '6px solid #dbeafe' };
    if (price < 100) return { background: 'linear-gradient(90deg, #818cf8 0%, #4f46e5 100%)', borderLeft: '6px solid #e0e7ff' };
    if (price < 500) return { background: 'linear-gradient(90deg, #f472b6 0%, #db2777 100%)', borderLeft: '6px solid #fce7f3' };
    return { background: 'linear-gradient(90deg, #fbbf24 0%, #d97706 100%)', borderLeft: '6px solid #fef3c7' };
};

// 舰长资源
const getGuardAssets = (level?: number) => {
    switch (level) {
        case 1: return { icon: '/zongdu.png', gradient: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)' };
        case 2: return { icon: '/tidu.png', gradient: 'linear-gradient(90deg, #c084fc 0%, #9333ea 50%, #7e22ce 100%)' };
        default: return { icon: '/jianzhang.png', gradient: 'linear-gradient(90deg, #60a5fa 0%, #2563eb 50%, #1d4ed8 100%)' };
    }
};

// 金币图标
const GoldCoin = ({ size = 18 }: { size?: number }) => (
    <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
        border: '1px solid #fef08a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#78350f', fontWeight: 'bold', fontSize: size * 0.6, flexShrink: 0,
    }}>¥</div>
);

// SC 卡片
function SCCard({ t }: { t: Transaction }) {
    const c = getSCColors(t.price);
    return (
        <div style={{
            width: `${OVERLAY_CARD_WIDTH}px`, maxWidth: '100%', borderRadius: '16px', overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontFamily: '"Microsoft YaHei", sans-serif',
        }}>
            <div style={{ backgroundColor: c.headerBg, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.8)', overflow: 'hidden', flexShrink: 0, background: '#ddd' }}>
                        {t.uface && <img src={t.uface} alt={t.uname || '用户头像'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />}
                    </div>
                    <span style={{ fontSize: '14px', color: c.headerText, fontWeight: 'bold' }}>{t.uname}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: c.headerText, fontSize: '16px' }}>
                    <span>{t.price}</span><GoldCoin size={16} />
                </div>
            </div>
            <div style={{ backgroundColor: c.bodyBg, padding: '12px 14px', color: '#fff', fontSize: '14px', lineHeight: 1.5 }}>{t.content}</div>
        </div>
    );
}

// 礼物/舰长 卡片
function GiftCard({ t }: { t: Transaction }) {
    const isGuard = t.type === 'guard';
    const guard = isGuard ? getGuardAssets(t.guardLevel) : null;
    const match = t.content.match(/^(.*?) x(\d+)(.*)$/);
    const giftName = match ? match[1] : t.content;
    const giftNum = match ? match[2] : '';

    const barStyle: React.CSSProperties = {
        position: 'absolute', left: '16px', right: 0, top: 0, bottom: 0,
        borderRadius: '8px', transform: 'skewX(-12deg)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)', zIndex: 0,
        ...(isGuard && guard ? { background: guard.gradient, borderLeft: '6px solid #fff' } : getPriceStyle(t.price)),
    };

    return (
        <div style={{
            width: `${OVERLAY_CARD_WIDTH}px`, maxWidth: '100%', height: `${OVERLAY_GIFT_CARD_HEIGHT}px`, display: 'flex', alignItems: 'center',
            position: 'relative', flexShrink: 0, flexGrow: 0,
        }}>
            <div style={barStyle} />
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', width: '100%', paddingRight: '12px' }}>
                <div style={{ marginRight: '10px', flexShrink: 0 }}>
                    <div style={{
                        width: '52px', height: '52px', borderRadius: '50%',
                        border: isGuard ? 'none' : '3px solid white',
                        overflow: 'hidden', backgroundColor: '#fff',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    }}>
                        {t.uface ? (
                            <img src={t.uface} alt={t.uname || '用户头像'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa', fontSize: '18px', fontWeight: 'bold' }}>{t.uname?.[0] || '?'}</div>
                        )}
                    </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.uname}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap' }}>
                        {isGuard ? <span style={{ color: '#fde047', fontWeight: 'bold' }}>上舰 {giftName}</span> : <><span>投喂 </span><span style={{ color: '#fde047', fontWeight: 'bold' }}>{giftName}</span></>}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                    {isGuard && guard && <img src={guard.icon} alt="舰长图标" style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} />}
                    {t.icon && !isGuard && <img src={t.icon} alt={giftName || '礼物图标'} style={{ width: '44px', height: '44px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} referrerPolicy="no-referrer" />}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        {giftNum && <div style={{ fontFamily: 'Arial', fontWeight: 900, fontStyle: 'italic', fontSize: '22px', color: '#fde047', textShadow: '2px 2px 0px rgba(0,0,0,0.4)', lineHeight: 1 }}><span style={{ fontSize: '16px' }}>x</span>{giftNum}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{t.price}</span>
                            <GoldCoin size={16} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ===== 主组件 =====
export default function OverlayPage() {
    const params = useParams();
    const code = params.code as string;
    const [items, setItems] = useState<Transaction[]>([]);
    const prevPayloadRef = useRef<string>('');
    const [scrollSpeed, setScrollSpeed] = useState(5);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [totalHeight, setTotalHeight] = useState(0);
    const offsetRef = useRef(0);
    const rafRef = useRef<number>(0);
    const measureRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // 挂载时强制清除背景
    useEffect(() => {
        document.body.className = '';
        document.body.style.cssText = 'background:transparent!important;margin:0;padding:0;overflow:hidden';
        document.documentElement.style.cssText = 'background:transparent!important';
        const observer = new MutationObserver(() => {
            document.querySelectorAll('nextjs-portal,[data-nextjs-toast]').forEach(el => el.remove());
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    // 读取滚动速度配置（启动时 + 每 5 秒轮询）
    useEffect(() => {
        const fetchConfig = () => {
            fetch(`/api/overlay/${code}/config`)
                .then((res) => res.json())
                .then((config) => {
                    if (typeof config.scrollSpeed === 'number') setScrollSpeed(config.scrollSpeed);
                    if (typeof config.scrollEnabled === 'boolean') setScrollEnabled(config.scrollEnabled);
                })
                .catch(() => {});
        };
        fetchConfig();
        const interval = setInterval(fetchConfig, 5000);
        return () => clearInterval(interval);
    }, [code]);

    // 测量一份 items 的总高度
    useEffect(() => {
        if (measureRef.current) {
            const h = measureRef.current.scrollHeight;
            setTotalHeight(h);
        }
    }, [items]);

    // items 变化时重置偏移
    useEffect(() => {
        offsetRef.current = 0;
    }, [items]);

    // rAF 驱动滚动 — 直接操作 DOM 避免 React re-render
    // 只有手动开启且 items > 8 时滚动，少量内容静止显示单份
    useEffect(() => {
        const el = scrollRef.current;
        const shouldScroll = scrollEnabled && items.length > 8;
        if (!shouldScroll || totalHeight === 0 || !el) {
            offsetRef.current = 0;
            if (el) el.style.transform = 'translateY(0)';
            return;
        }

        let lastTime = 0;
        const step = (time: number) => {
            if (lastTime) {
                const delta = time - lastTime;
                offsetRef.current += (scrollSpeed * 0.3 * delta) / 16;
                if (offsetRef.current >= totalHeight) {
                    offsetRef.current -= totalHeight;
                }
                el.style.transform = `translateY(${-offsetRef.current}px)`;
            }
            lastTime = time;
            rafRef.current = requestAnimationFrame(step);
        };

        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
    }, [scrollSpeed, scrollEnabled, totalHeight, items.length]);

    // 轮询获取数据
    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`/api/overlay/${code}/poll`);
            if (res.ok) {
                const data = await res.json() as Transaction[];
                const nextPayload = JSON.stringify(data);
                if (nextPayload !== prevPayloadRef.current) {
                    prevPayloadRef.current = nextPayload;
                    setItems(data);
                }
            }
        } catch { }
    }, [code]);

    useEffect(() => {
        const initialTimer = window.setTimeout(fetchData, 0);
        const intervalTimer = window.setInterval(fetchData, 5000);
        return () => {
            window.clearTimeout(initialTimer);
            window.clearInterval(intervalTimer);
        };
    }, [fetchData]);

    const shouldScroll = scrollEnabled && items.length > 8;

    return (
        <>
            <style>{`
                *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { background: transparent !important; background-color: transparent !important; overflow: hidden !important; }
                body { font-family: "Microsoft YaHei", sans-serif; }
                nextjs-portal, [data-sonner-toaster], [data-nextjs-dialog-overlay] { display: none !important; }
            `}</style>
            <div style={{
                overflow: 'hidden',
                width: '100%',
                height: '100vh',
                position: 'relative',
            }}>
                {/* 隐藏的测量容器 — 只渲染一份 items 用来算总高度 */}
                <div ref={measureRef} style={{
                    position: 'absolute',
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: `${OVERLAY_CARD_GAP}px`,
                    padding: 0,
                    width: '100%',
                }}>
                    {items.map((item) => (
                        item.type === 'super_chat'
                            ? <SCCard key={item.id} t={item} />
                            : <GiftCard key={item.id} t={item} />
                    ))}
                </div>

                {/* 滚动容器 — 滚动时渲染两份实现无缝循环 */}
                <div ref={scrollRef} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: `${OVERLAY_CARD_GAP}px`,
                    padding: 0,
                    width: '100%',
                }}>
                    {items.map((item) => (
                        item.type === 'super_chat'
                            ? <SCCard key={item.id} t={item} />
                            : <GiftCard key={item.id} t={item} />
                    ))}
                    {shouldScroll && items.map((item) => (
                        item.type === 'super_chat'
                            ? <SCCard key={`dup-${item.id}`} t={item} />
                            : <GiftCard key={`dup-${item.id}`} t={item} />
                    ))}
                </div>

                {items.length === 0 && (
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', textAlign: 'center', width: '100%', paddingTop: '20px' }}>
                        等待礼物数据...
                    </div>
                )}
            </div>
        </>
    );
}
