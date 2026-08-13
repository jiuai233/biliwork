'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * SSE (Server-Sent Events) Hook
 * 
 * 替代旧的 setInterval 轮询模式，使用服务端推送
 * 自动处理连接、重连、错误恢复
 */
export function useSSE<T>(
    url: string,
    options?: {
        onError?: (error: Event) => void;
        retryInterval?: number; // 重连间隔（ms），默认 5000
    }
) {
    const [data, setData] = useState<T | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryDelayRef = useRef(0);
    const connectRef = useRef<() => void>(() => undefined);
    const optionsRef = useRef(options);

    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    const connect = useCallback(() => {
        if (!url) return;

        // 清理旧连接
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
            setIsConnected(true);
            setError(null);
            retryDelayRef.current = 0;
        };

        es.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                if (parsed.error) {
                    setError(parsed.error);
                } else {
                    setData(parsed);
                    setError(null);
                }
            } catch {
                console.error('SSE parse error:', event.data);
            }
        };

        es.onerror = (event) => {
            setIsConnected(false);
            es.close();
            optionsRef.current?.onError?.(event);

            // 指数退避自动重连：5s → 10s → 20s → 40s → 60s 封顶
            const base = optionsRef.current?.retryInterval ?? 5000;
            retryDelayRef.current = retryDelayRef.current === 0
                ? base
                : Math.min(retryDelayRef.current * 2, 60_000);
            retryTimeoutRef.current = setTimeout(() => {
                connectRef.current();
            }, retryDelayRef.current);
        };
    }, [url]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        connect();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [connect]);

    // 手动重连：立即尝试并重置退避（失败则重新从基础间隔开始）
    const reconnect = useCallback(() => {
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
        }
        retryDelayRef.current = 0;
        connect();
    }, [connect]);

    return { data, isConnected, error, reconnect };
}
