import { getLiveSessionsWithIncome } from '@/lib/services/blindbox';
import { prisma } from '@/lib/db';

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({
    prisma: {
        liveStatus: { findMany: jest.fn() },
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
