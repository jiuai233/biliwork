import {
    addCalendarDays,
    dedupeGiftItems,
    giftStreamUniqueKey,
    giftTimeToTs,
    splitMonthRanges,
    yearStartShanghaiYmd,
    yesterdayShanghaiYmd,
    type GiftStreamItem,
} from '@/lib/gift-stream-range';

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

describe('gift stream range', () => {
    it('splits Jan 1 through yesterday into calendar months', () => {
        expect(splitMonthRanges('20260101', '20260823')).toEqual([
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

    it('returns empty ranges when begin is after end', () => {
        expect(splitMonthRanges('20260101', '20251231')).toEqual([]);
    });

    it('uses Shanghai calendar for year start and yesterday', () => {
        const now = new Date('2026-08-24T04:00:00+08:00');
        expect(yearStartShanghaiYmd(now)).toBe('20260101');
        expect(yesterdayShanghaiYmd(now)).toBe('20260823');
        expect(addCalendarDays('20260228', 1)).toBe('20260301');
    });

    it('dedupes cross-page overlapping records', () => {
        const unique = dedupeGiftItems([
            item({ time: '2026-07-01 00:00:25', uid: 1 }),
            item({ time: '2026-07-01 00:00:25', uid: 1 }),
            item({ time: '2026-07-01 00:00:25', uid: 2 }),
        ]);
        expect(unique).toHaveLength(2);
        expect(giftStreamUniqueKey(unique[0])).toBe('2026-07-01 00:00:25|1|1|1|50');
    });

    it('parses gift time as Asia/Shanghai', () => {
        expect(giftTimeToTs('2026-07-01 00:00:25')).toBe(Date.parse('2026-07-01T00:00:25+08:00'));
    });
});
