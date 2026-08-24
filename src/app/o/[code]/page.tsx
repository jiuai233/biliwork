'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
    BILI_CARD_GAP,
    TransactionCard,
} from '@/components/bilibili/TransactionCard';
import type { BiliTransactionCardData } from '@/lib/bilibili-cards';

/** OBS browser source API (injected by obs-browser, absent in normal browsers). */
declare global {
    interface Window {
        obsstudio?: {
            getCurrentScene?: (callback: (scene: { name: string }) => void) => void;
        };
    }
}

/**
 * Maps OBS scene name markers to classes on <html>.
 * "游戏 [dark]" -> .obs-dark, "[scene:chat]" -> .obs-scene-chat
 */
function applySceneClasses(sceneName: string) {
    const root = document.documentElement;
    for (const cls of Array.from(root.classList)) {
        if (cls.startsWith('obs-')) root.classList.remove(cls);
    }
    if (/\[dark\]/i.test(sceneName)) root.classList.add('obs-dark');
    const sceneTag = sceneName.match(/\[scene:([\w-]+)\]/i);
    if (sceneTag) root.classList.add(`obs-scene-${sceneTag[1].toLowerCase()}`);
}

export default function OverlayPage() {
    const params = useParams();
    const code = params.code as string;
    const [items, setItems] = useState<BiliTransactionCardData[]>([]);
    const prevPayloadRef = useRef<string>('');
    const [scrollSpeed, setScrollSpeed] = useState(5);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [totalHeight, setTotalHeight] = useState(0);
    const offsetRef = useRef(0);
    const rafRef = useRef<number>(0);
    const measureRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const knownIdsRef = useRef<Set<string> | null>(null);
    const [enteringIds, setEnteringIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        document.body.className = '';
        document.body.style.cssText = 'background:transparent!important;margin:0;padding:0;overflow:hidden';
        document.documentElement.style.cssText = 'background:transparent!important';
        const observer = new MutationObserver(() => {
            document.querySelectorAll('nextjs-portal,[data-nextjs-toast]').forEach((el) => el.remove());
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const onSceneChanged = (event: Event) => {
            const name = (event as CustomEvent<{ name: string }>).detail?.name;
            if (name) applySceneClasses(name);
        };
        window.addEventListener('obsSceneChanged', onSceneChanged);
        window.obsstudio?.getCurrentScene?.((scene) => {
            if (scene?.name) applySceneClasses(scene.name);
        });
        return () => window.removeEventListener('obsSceneChanged', onSceneChanged);
    }, []);

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

    useEffect(() => {
        if (measureRef.current) {
            setTotalHeight(measureRef.current.scrollHeight);
        }
    }, [items]);

    useEffect(() => {
        offsetRef.current = 0;
    }, [items]);

    useEffect(() => {
        const el = scrollRef.current;
        const reduceMotion = typeof window !== 'undefined'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const shouldScroll = scrollEnabled && items.length > 8 && !reduceMotion;
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

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`/api/overlay/${code}/poll`);
            if (res.ok) {
                const data = await res.json() as BiliTransactionCardData[];
                const nextPayload = JSON.stringify(data);
                if (nextPayload !== prevPayloadRef.current) {
                    prevPayloadRef.current = nextPayload;
                    if (knownIdsRef.current === null) {
                        knownIdsRef.current = new Set(data.map((item) => item.id));
                    } else {
                        const known = knownIdsRef.current;
                        const entering = new Set<string>();
                        for (const item of data) {
                            if (!known.has(item.id)) {
                                known.add(item.id);
                                entering.add(item.id);
                            }
                        }
                        setEnteringIds(entering);
                    }
                    setItems(data);
                }
            }
        } catch { /* overlay poll is best-effort */ }
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

    const renderItems = (prefix = '') =>
        items.map((item) => (
            <TransactionCard
                key={`${prefix}${item.id}`}
                transaction={item}
                size="overlay"
                className={!prefix && enteringIds.has(item.id) ? 'biweb-card-enter' : undefined}
            />
        ));

    return (
        <>
            <style>{`
                *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { background: transparent !important; overflow: hidden !important; }
                body { font-family: "Microsoft YaHei", sans-serif; }
                nextjs-portal, [data-sonner-toaster], [data-nextjs-dialog-overlay] { display: none !important; }
                @keyframes biweb-card-in {
                    0% { opacity: 0; transform: translateX(40px) scale(0.96); }
                    60% { opacity: 1; transform: translateX(-4px) scale(1.01); }
                    100% { opacity: 1; transform: translateX(0) scale(1); }
                }
                .biweb-card-enter { animation: biweb-card-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
                @media (prefers-reduced-motion: reduce) {
                    .biweb-card-enter { animation: none; }
                }
            `}</style>
            <div style={{ overflow: 'hidden', width: '100%', height: '100vh', position: 'relative' }}>
                <div
                    ref={measureRef}
                    style={{
                        position: 'absolute',
                        visibility: 'hidden',
                        pointerEvents: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: `${BILI_CARD_GAP}px`,
                        width: '100%',
                    }}
                >
                    {renderItems('measure-')}
                </div>

                <div
                    ref={scrollRef}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: `${BILI_CARD_GAP}px`,
                        width: '100%',
                    }}
                >
                    {renderItems()}
                    {shouldScroll && renderItems('dup-')}
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
