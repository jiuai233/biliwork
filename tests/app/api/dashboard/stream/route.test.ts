/**
 * @jest-environment node
 */
import { GET } from '@/app/api/dashboard/stream/route';
import { getBroadcasterByUid, getStats } from '@/lib/data';

jest.mock('@/lib/auth', () => ({ getSession: jest.fn().mockResolvedValue(1) }));
jest.mock('@/lib/data', () => ({
    getBroadcasterByUid: jest.fn().mockResolvedValue({ room_id: 10 }),
    getStats: jest.fn().mockResolvedValue({}),
    getRecentDanmaku: jest.fn().mockResolvedValue([]),
    getRecentGifts: jest.fn().mockResolvedValue([]),
    getRecentGuards: jest.fn().mockResolvedValue([]),
    getRecentSuperChats: jest.fn().mockResolvedValue([]),
    getTopDanmakuUsers: jest.fn().mockResolvedValue([]),
    getTopGiftUsers: jest.fn().mockResolvedValue([]),
}));

test('equivalent SSE connections share one query batch', async () => {
    jest.useFakeTimers();
    const request = () => ({
        nextUrl: { searchParams: new URLSearchParams('startTime=100&endTime=200') },
        signal: new AbortController().signal,
    });

    const [first, second] = await Promise.all([GET(request() as never), GET(request() as never)]);
    const readers = [first.body!.getReader(), second.body!.getReader()];
    await Promise.all(readers.map((reader) => reader.read()));

    expect(getBroadcasterByUid).toHaveBeenCalledTimes(1);
    expect(getStats).toHaveBeenCalledTimes(2);

    await Promise.all(readers.map((reader) => reader.cancel()));
    jest.clearAllTimers();
    jest.useRealTimers();
});
