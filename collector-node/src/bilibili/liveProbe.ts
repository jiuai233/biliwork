const ROOM_INFO_URL = 'https://api.live.bilibili.com/room/v1/Room/get_info';
const REQUEST_TIMEOUT_MS = 5_000;

interface RoomInfoResponse {
    code: number;
    data?: { live_status?: number };
}

export async function probeRoomLive(roomId: number): Promise<boolean | undefined> {
    try {
        const url = new URL(ROOM_INFO_URL);
        url.searchParams.set('room_id', String(roomId));
        const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        if (!response.ok) return undefined;

        const payload = await response.json() as RoomInfoResponse;
        if (payload.code !== 0 || !payload.data) return undefined;
        return payload.data.live_status === 1;
    } catch {
        return undefined;
    }
}

export async function probeUnknownLiveRooms(
    rooms: { authCode: string; roomId: number }[],
    onLive: (authCode: string) => void,
    options: {
        concurrency?: number;
        delayMs?: number;
        shouldStop?: () => boolean;
    } = {},
): Promise<void> {
    const concurrency = options.concurrency ?? 3;
    const delayMs = options.delayMs ?? 200;
    let next = 0;

    const workers = Array.from({ length: Math.min(concurrency, rooms.length) }, async () => {
        while (next < rooms.length) {
            if (options.shouldStop?.()) return;
            const index = next;
            next += 1;
            const room = rooms[index];
            if (!room) return;

            const live = await probeRoomLive(room.roomId);
            if (live) onLive(room.authCode);
            if (delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }
    });

    await Promise.all(workers);
}
