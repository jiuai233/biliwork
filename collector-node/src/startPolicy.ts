export const LIVE_START_CONCURRENCY = 3;
export const LIVE_START_SPACING_MS = 1_000;
export const NORMAL_START_SPACING_MS = 3_000;
export const LIVE_RECONNECT_BASE_MS = 2_000;
export const NORMAL_RECONNECT_BASE_MS = 5_000;
export const LIVE_RECONNECT_MAX_MS = 60_000;
export const NORMAL_RECONNECT_MAX_MS = 300_000;

export function reconnectBackoffMs(failures: number, live: boolean): number {
    const safeFailures = Math.max(1, failures);
    const base = live ? LIVE_RECONNECT_BASE_MS : NORMAL_RECONNECT_BASE_MS;
    const max = live ? LIVE_RECONNECT_MAX_MS : NORMAL_RECONNECT_MAX_MS;
    return Math.min(base * 2 ** (safeFailures - 1), max);
}

export function startSpacingMs(hasLiveWaiting: boolean): number {
    return hasLiveWaiting ? LIVE_START_SPACING_MS : NORMAL_START_SPACING_MS;
}

export function liveStartSlotsAvailable(inFlight: number, concurrency = LIVE_START_CONCURRENCY): number {
    return Math.max(0, concurrency - Math.max(0, inFlight));
}

export function partitionStartOrder<T extends { authCode: string; live: boolean }>(
    rows: T[],
): { live: string[]; rest: string[] } {
    const live: string[] = [];
    const rest: string[] = [];
    for (const row of rows) {
        if (row.live) live.push(row.authCode);
        else rest.push(row.authCode);
    }
    return { live, rest };
}
