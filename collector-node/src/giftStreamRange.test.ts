import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
    resumeBegin,
    splitMonthRanges,
    giftStreamUniqueKey,
    dedupeGiftItems,
    type GiftStreamItem,
} from './giftStreamRange.ts';

function item(partial: Partial<GiftStreamItem>): GiftStreamItem {
    return {
        uid: 1,
        uname: 'a',
        time: '2026-07-01 00:00:25',
        goods_id: 15,
        gift_id: 1,
        name: '辣条',
        num: 1,
        hamster: 50,
        receive_title: '主播',
        room_id: 1,
        ...partial,
    };
}

describe('splitMonthRanges', () => {
    test('splits Jan 1 through late August', () => {
        assert.deepEqual(splitMonthRanges('20260101', '20260823'), [
            { begin: '20260101', end: '20260131' },
            { begin: '20260201', end: '20260228' },
            { begin: '20260301', end: '20260331' },
            { begin: '20260401', end: '20260430' },
            { begin: '20260501', end: '20260531' },
            { begin: '20260601', end: '20260630' },
            { begin: '20260701', end: '20260731' },
            { begin: '20260801', end: '20260823' },
        ]);
    });
});

describe('resumeBegin', () => {
    test('starts at range begin without cursor', () => {
        assert.equal(resumeBegin('20260101', null), '20260101');
    });

    test('continues the day after a completed month', () => {
        assert.equal(resumeBegin('20260101', '20260731'), '20260801');
    });
});

describe('dedupe', () => {
    test('drops cross-page duplicates', () => {
        const unique = dedupeGiftItems([
            item({ uid: 1 }),
            item({ uid: 1 }),
            item({ uid: 2 }),
        ]);
        assert.equal(unique.length, 2);
        assert.equal(giftStreamUniqueKey(unique[0]), '2026-07-01 00:00:25|1|1|1|50');
    });
});
