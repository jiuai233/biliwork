import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { Danmaku, Gift, Guard, SuperChat } from '@/lib/types';

export interface Transaction {
    id: string;
    type: 'gift' | 'guard' | 'super_chat';
    uname: string;
    uface: string;
    content: string;
    price: number;
    ts: number;
    icon?: string;
    guardLevel?: number;
}

type UnifiedTransactionsOptions = {
    limit?: number;
    startTime?: number;
    endTime?: number;
};

function buildTsRange(startTime?: number, endTime?: number): Prisma.BigIntNullableFilter | undefined {
    if (!startTime && !endTime) return undefined;

    const range: Prisma.BigIntNullableFilter = {};
    if (startTime) range.gte = BigInt(startTime);
    if (endTime) range.lte = BigInt(endTime);
    return range;
}

// 获取范围内的弹幕
export async function getRecentDanmaku(roomId: number, limit = 50, startTime?: number, endTime?: number): Promise<Danmaku[]> {
    const where: Prisma.DanmakuWhereInput = { roomId };

    if (startTime || endTime) {
        where.ts = {};
        if (startTime) where.ts.gte = BigInt(startTime);
        if (endTime) where.ts.lte = BigInt(endTime);
    }

    const rows = await prisma.danmaku.findMany({
        where,
        orderBy: { ts: 'desc' },
        take: limit
    });

    return rows.map(r => ({
        id: Number(r.id),
        room_id: r.roomId,
        open_id: r.openId,
        uname: r.uname,
        uface: r.uface,
        msg: r.msg,
        msg_id: r.msgId,
        dm_type: r.dmType,
        emoji_img_url: r.emojiImgUrl,
        fans_medal_level: r.fansMedalLevel,
        fans_medal_name: r.fansMedalName,
        guard_level: r.guardLevel,
        ts: r.ts ? Number(r.ts) : null,
        created_at: r.createdAt
    }));
}

// 获取范围内的礼物
export async function getRecentGifts(roomId: number, limit = 50, startTime?: number, endTime?: number): Promise<Gift[]> {
    const where: Prisma.GiftWhereInput = { roomId };

    if (startTime || endTime) {
        where.ts = {};
        if (startTime) where.ts.gte = BigInt(startTime);
        if (endTime) where.ts.lte = BigInt(endTime);
    }

    const rows = await prisma.gift.findMany({
        where,
        orderBy: { ts: 'desc' },
        take: limit
    });

    return rows.map(r => ({
        id: Number(r.id),
        room_id: r.roomId,
        open_id: r.openId,
        uname: r.uname,
        uface: r.uface,
        gift_id: r.giftId,
        gift_name: r.giftName,
        gift_num: r.giftNum,
        gift_icon: r.giftIcon,
        price: r.price,
        r_price: r.rPrice,
        paid: r.paid,
        fans_medal_level: r.fansMedalLevel,
        fans_medal_name: r.fansMedalName,
        guard_level: r.guardLevel,
        msg_id: r.msgId,
        ts: r.ts ? Number(r.ts) : null,
        created_at: r.createdAt
    }));
}

// 获取范围内的舰长
export async function getRecentGuards(roomId: number, limit = 20, startTime?: number, endTime?: number): Promise<Guard[]> {
    const where: Prisma.GuardWhereInput = { roomId };

    if (startTime || endTime) {
        where.ts = {};
        if (startTime) where.ts.gte = BigInt(startTime);
        if (endTime) where.ts.lte = BigInt(endTime);
    }

    const rows = await prisma.guard.findMany({
        where,
        orderBy: { ts: 'desc' },
        take: limit
    });

    return rows.map(r => ({
        id: Number(r.id),
        room_id: r.roomId,
        open_id: r.openId,
        uname: r.uname,
        uface: r.uface,
        guard_level: r.guardLevel,
        guard_num: r.guardNum,
        guard_unit: r.guardUnit,
        price: r.price,
        fans_medal_level: r.fansMedalLevel,
        fans_medal_name: r.fansMedalName,
        msg_id: r.msgId,
        ts: r.ts ? Number(r.ts) : null,
        created_at: r.createdAt
    }));
}

// 获取范围内的SC
export async function getRecentSuperChats(roomId: number, limit = 20, startTime?: number, endTime?: number): Promise<SuperChat[]> {
    const where: Prisma.SuperChatWhereInput = { roomId };

    if (startTime || endTime) {
        where.ts = {};
        if (startTime) where.ts.gte = BigInt(startTime);
        if (endTime) where.ts.lte = BigInt(endTime);
    }

    const rows = await prisma.superChat.findMany({
        where,
        orderBy: { ts: 'desc' },
        take: limit
    });

    return rows.map(r => ({
        id: Number(r.id),
        room_id: r.roomId,
        open_id: r.openId,
        uname: r.uname,
        uface: r.uface,
        message_id: r.messageId ? Number(r.messageId) : null,
        message: r.message,
        rmb: r.rmb,
        start_time: r.startTime ? Number(r.startTime) : null,
        end_time: r.endTime ? Number(r.endTime) : null,
        guard_level: r.guardLevel,
        fans_medal_level: r.fansMedalLevel,
        fans_medal_name: r.fansMedalName,
        msg_id: r.msgId,
        ts: r.ts ? Number(r.ts) : null,
        created_at: r.createdAt
    }));
}

export async function getUnifiedTransactions(
    roomId: number,
    optionsOrLimit: number | UnifiedTransactionsOptions = 100
): Promise<Transaction[]> {
    const options: UnifiedTransactionsOptions = typeof optionsOrLimit === 'number'
        ? { limit: optionsOrLimit }
        : optionsOrLimit;
    const tsRange = buildTsRange(options.startTime, options.endTime);
    const giftWhere: Prisma.GiftWhereInput = { roomId };
    const guardWhere: Prisma.GuardWhereInput = { roomId };
    const superChatWhere: Prisma.SuperChatWhereInput = { roomId };

    if (tsRange) {
        giftWhere.ts = tsRange;
        guardWhere.ts = tsRange;
        superChatWhere.ts = tsRange;
    }

    const giftQuery: Prisma.GiftFindManyArgs = {
        where: giftWhere,
        orderBy: { ts: 'desc' },
    };
    const guardQuery: Prisma.GuardFindManyArgs = {
        where: guardWhere,
        orderBy: { ts: 'desc' },
    };
    const superChatQuery: Prisma.SuperChatFindManyArgs = {
        where: superChatWhere,
        orderBy: { ts: 'desc' },
    };

    if (options.limit) {
        giftQuery.take = options.limit;
        guardQuery.take = options.limit;
        superChatQuery.take = options.limit;
    }

    // Fetch all types in parallel
    const [gifts, guards, scs] = await Promise.all([
        prisma.gift.findMany(giftQuery),
        prisma.guard.findMany(guardQuery),
        prisma.superChat.findMany(superChatQuery)
    ]);

    const giftTxns: Transaction[] = gifts.map(g => ({
        id: `gift_${g.id}`,
        type: 'gift' as const,
        uname: g.uname || '',
        uface: g.uface || '',
        content: `${g.giftName || ''} x${g.giftNum}`,
        price: (g.rPrice * g.giftNum) / 1000,
        ts: g.ts ? Number(g.ts) : 0,
        icon: g.giftIcon || undefined
    }));

    const guardTxns: Transaction[] = guards.map(g => {
        const levelName = g.guardLevel === 1 ? '总督' : g.guardLevel === 2 ? '提督' : '舰长';
        return {
            id: `guard_${g.id}`,
            type: 'guard' as const,
            uname: g.uname || '',
            uface: g.uface || '',
            content: `${levelName} x${g.guardNum} ${g.guardUnit || ''}`,
            price: g.price / 1000,
            ts: g.ts ? Number(g.ts) : 0,
            guardLevel: g.guardLevel || undefined
        };
    });

    const scTxns: Transaction[] = scs.map(sc => ({
        id: `sc_${sc.id}`,
        type: 'super_chat' as const,
        uname: sc.uname || '',
        uface: sc.uface || '',
        content: sc.message || '',
        price: sc.rmb,
        ts: sc.ts ? Number(sc.ts) : 0
    }));

    // Merge and sort
    const all = [...giftTxns, ...guardTxns, ...scTxns];
    all.sort((a, b) => b.ts - a.ts);

    return options.limit ? all.slice(0, options.limit) : all;
}
