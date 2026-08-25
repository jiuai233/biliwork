import {
    BLINDBOX_COST,
    BLINDBOX_GIFTS,
    BLINDBOX_PRIZES,
    buildBlindboxStatsFromGiftCounts,
    getBlindboxStats,
    getBlindboxStreamerSummaries,
    getLiveSessionsWithIncome,
} from '@/lib/services/blindbox';
import { prisma } from '@/lib/db';

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({
    prisma: {
        liveStatus: { findMany: jest.fn() },
        gift: { findMany: jest.fn(), groupBy: jest.fn() },
        $queryRaw: jest.fn(),
    },
}));

test('assigns ordered income rows to non-overlapping sessions in one pass', async () => {
    const liveStatus = prisma.liveStatus.findMany as jest.Mock;
    const queryRaw = prisma.$queryRaw as jest.Mock;
    liveStatus.mockResolvedValue([
        { id: 1n, roomId: 10, isStart: 1, ts: 1_000n, title: 'first', areaName: null },
        { id: 2n, roomId: 10, isStart: 0, ts: 1_999n, title: null, areaName: null },
        { id: 3n, roomId: 10, isStart: 1, ts: 2_000n, title: 'second', areaName: null },
        { id: 4n, roomId: 10, isStart: 0, ts: 2_999n, title: null, areaName: null },
    ]);
    queryRaw.mockResolvedValue([
        { source: 'gift', ts: 1_500n, value: 1_000n },
        { source: 'guard', ts: 2_000n, value: 2_000n },
        { source: 'sc', ts: 2_999n, value: 3_000n },
    ]);

    const sessions = await getLiveSessionsWithIncome(10, 1_000, 2_999);

    expect(sessions.map(({ id, giftIncome, guardIncome, scIncome }) => ({ id, giftIncome, guardIncome, scIncome }))).toEqual([
        { id: 3, giftIncome: 0, guardIncome: 2, scIncome: 3 },
        { id: 1, giftIncome: 1, guardIncome: 0, scIncome: 0 },
    ]);
});

test('buildBlindboxStatsFromGiftCounts fills all gift types and ignores unknown names', () => {
    const stats = buildBlindboxStatsFromGiftCounts([
        { giftName: '电影票', count: 4 },
        { giftName: '棉花糖', count: 2 },
        { giftName: '未知礼物', count: 9 },
    ]);

    expect(stats.distribution).toHaveLength(Object.keys(BLINDBOX_PRIZES).length);
    expect(stats.totalBoxes).toBe(6);
    expect(stats.totalCost).toBe(6 * BLINDBOX_COST);
    expect(stats.totalOutput).toBe(4 * BLINDBOX_PRIZES['电影票'] + 2 * BLINDBOX_PRIZES['棉花糖']);
    expect(stats.distribution.find((item) => item.name === '电影票')?.count).toBe(4);
    expect(stats.distribution.find((item) => item.name === '浪漫城堡')?.count).toBe(0);
    expect(stats.distribution.find((item) => item.name === '神驹宝玺')).toMatchObject({ count: 0, value: 2000 });
    expect(stats.distribution.find((item) => item.name === '蛇形护符')).toBeUndefined();
});

test('folds shuvi skins into the parent prize for stats', () => {
    const stats = buildBlindboxStatsFromGiftCounts([
        { giftName: '神驹宝玺', count: 1 },
        { giftName: '蛇形护符', count: 2 },
        { giftName: '梦幻气球', count: 3 },
        { giftName: '电影票', count: 1 },
    ]);

    expect(stats.distribution.find((item) => item.name === '神驹宝玺')).toMatchObject({
        count: 3,
        value: 2000,
        totalValue: 6000,
    });
    expect(stats.distribution.find((item) => item.name === '电影票')).toMatchObject({
        count: 4,
        value: 20,
        totalValue: 80,
    });
    expect(stats.totalBoxes).toBe(7);
    expect(stats.totalOutput).toBe(6080);
    expect(BLINDBOX_GIFTS['蛇形护符']).toBe(BLINDBOX_PRIZES['神驹宝玺']);
    expect(BLINDBOX_GIFTS['梦幻气球']).toBe(BLINDBOX_PRIZES['电影票']);
});

test('getBlindboxStats returns empty totals without querying when room list is empty', async () => {
    const findMany = prisma.gift.findMany as jest.Mock;
    const groupBy = prisma.gift.groupBy as jest.Mock;

    const stats = await getBlindboxStats([], 0, 1_000);

    expect(findMany).not.toHaveBeenCalled();
    expect(groupBy).not.toHaveBeenCalled();
    expect(stats.totalBoxes).toBe(0);
    expect(stats.records).toEqual([]);
});

test('getBlindboxStats queries all given rooms and maps record room ids', async () => {
    const findMany = prisma.gift.findMany as jest.Mock;
    const groupBy = prisma.gift.groupBy as jest.Mock;
    findMany.mockResolvedValue([
        {
            id: 11n,
            roomId: 101,
            msgId: 'msg-1',
            uname: '用户甲',
            uface: null,
            giftName: '电影票',
            giftNum: 2,
            ts: 1_000n,
        },
    ]);
    groupBy.mockResolvedValue([
        { giftName: '电影票', _sum: { giftNum: 10 } },
        { giftName: '棉花糖', _sum: { giftNum: 1 } },
    ]);

    const stats = await getBlindboxStats([101, 202], 0, 2_000);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ roomId: { in: [101, 202] } }),
    }));
    expect(stats.totalBoxes).toBe(11);
    expect(stats.records[0]).toMatchObject({
        room_id: 101,
        gift_name: '电影票',
        gift_num: 2,
        cost: 2 * BLINDBOX_COST,
    });
});

test('getBlindboxStreamerSummaries keeps zero rooms and sorts by box count', async () => {
    const groupBy = prisma.gift.groupBy as jest.Mock;
    groupBy.mockResolvedValue([
        { roomId: 202, giftName: '电影票', _sum: { giftNum: 3 } },
        { roomId: 101, giftName: '棉花糖', _sum: { giftNum: 1 } },
    ]);

    const summaries = await getBlindboxStreamerSummaries([
        { roomId: 101, uname: '甲', uface: null },
        { roomId: 202, uname: '乙', uface: null },
        { roomId: 303, uname: '丙', uface: null },
    ], 0, 2_000);

    expect(summaries.map((item) => item.roomId)).toEqual([202, 101, 303]);
    expect(summaries[0].totalBoxes).toBe(3);
    expect(summaries[2]).toMatchObject({ roomId: 303, totalBoxes: 0, netProfit: 0 });
});
