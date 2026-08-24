import { fetchGiftStreamMonth } from '@/lib/bili-client';
import type { GiftStreamItem } from '@/lib/gift-stream-range';

function gift(uid: number): GiftStreamItem {
    return {
        uid,
        uname: `u${uid}`,
        time: '2026-07-01 00:00:25',
        goods_id: 15,
        gift_id: 31164,
        name: '粉丝团灯牌',
        num: 1,
        hamster: 50,
        receive_title: '主播',
        room_id: 1684998,
    };
}

describe('fetchGiftStreamMonth', () => {
    it('walks every page and dedupes overlapping records', async () => {
        const pages: GiftStreamItem[][] = [
            [gift(1), gift(2)],
            [gift(2), gift(3)],
        ];
        const fetchImpl = jest.fn(async (_url: string, init?: RequestInit) => {
            const body = typeof init?.body === 'string'
                ? new URLSearchParams(init.body)
                : init?.body as URLSearchParams;
            const page = Number(body.get('page'));
            return {
                status: 200,
                json: async () => ({
                    code: 0,
                    data: {
                        total_page: pages.length,
                        total_count: 4,
                        list: pages[page],
                    },
                }),
            };
        }) as unknown as typeof fetch;

        const result = await fetchGiftStreamMonth({
            cookie: 'SESSDATA=x; bili_jct=token',
            begin: '20260701',
            end: '20260731',
            fetchImpl,
            delayMs: 0,
        });

        expect(fetchImpl).toHaveBeenCalledTimes(2);
        expect(result.rawCount).toBe(4);
        expect(result.unique.map((item) => item.uid)).toEqual([1, 2, 3]);
        const firstBody = String((fetchImpl.mock.calls[0][1] as RequestInit).body);
        expect(firstBody).not.toContain('page_size');
    });
});
