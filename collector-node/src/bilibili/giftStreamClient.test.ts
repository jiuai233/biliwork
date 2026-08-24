import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fetchGiftStreamMonth } from './giftStreamClient.ts';
import type { GiftStreamItem } from '../giftStreamRange.ts';

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
    test('walks every page and dedupes overlapping records', async () => {
        const pages: GiftStreamItem[][] = [
            [gift(1), gift(2)],
            [gift(2), gift(3)],
        ];
        const fetchImpl = (async (_url: string, init?: RequestInit) => {
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

        assert.equal(result.rawCount, 4);
        assert.deepEqual(result.unique.map((item) => item.uid), [1, 2, 3]);
    });

    test('retries zero total_count before accepting an empty month', async () => {
        let calls = 0;
        const fetchImpl = (async () => {
            calls += 1;
            const empty = calls < 3;
            return {
                status: 200,
                json: async () => ({
                    code: 0,
                    data: {
                        total_page: empty ? 0 : 1,
                        total_count: empty ? 0 : 1,
                        list: empty ? [] : [gift(1)],
                    },
                }),
            };
        }) as unknown as typeof fetch;

        const result = await fetchGiftStreamMonth({
            cookie: 'SESSDATA=x; bili_jct=token',
            begin: '20260701',
            end: '20260731',
            fetchImpl,
            delayMs: 1,
        });

        assert.equal(result.totalCount, 1);
        assert.equal(result.unique.length, 1);
        assert.equal(calls, 3);
    });
});
