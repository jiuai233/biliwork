import { pool } from '../db.js';
import { generateSnowflakeId } from '../snowflake.js';
import type {
    DanmakuMessage,
    GiftMessage,
    GuardMessage,
    LiveStatusMessage,
    SuperChatMessage,
} from '../bilibili/messages.js';

export async function saveDanmaku(msg: DanmakuMessage) {
    await pool.query(`
        INSERT INTO danmaku (id, room_id, open_id, uname, uface, msg, msg_id, dm_type, emoji_img_url, fans_medal_level, fans_medal_name, guard_level, ts, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (msg_id) DO NOTHING
    `, [
        generateSnowflakeId(),
        msg.roomId,
        msg.openId,
        msg.uname,
        msg.uface,
        msg.msg,
        msg.msgId,
        msg.dmType,
        msg.emojiImgUrl,
        msg.fansMedalLevel,
        msg.fansMedalName,
        msg.guardLevel,
        msg.timestamp * 1000,
    ]);
}

export async function saveGift(msg: GiftMessage) {
    await pool.query(`
        INSERT INTO gift (id, room_id, open_id, uname, uface, gift_id, gift_name, gift_num, gift_icon, price, r_price, paid, fans_medal_level, fans_medal_name, guard_level, msg_id, ts, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
        ON CONFLICT (msg_id) DO NOTHING
    `, [
        generateSnowflakeId(),
        msg.roomId,
        msg.openId,
        msg.uname,
        msg.uface,
        msg.giftId,
        msg.giftName,
        msg.giftNum,
        msg.giftIcon,
        msg.price,
        msg.rPrice,
        msg.paid ? 1 : 0,
        msg.fansMedalLevel,
        msg.fansMedalName,
        msg.guardLevel,
        msg.msgId,
        msg.timestamp * 1000,
    ]);
}

export async function saveGuard(msg: GuardMessage) {
    await pool.query(`
        INSERT INTO guard (id, room_id, open_id, uname, uface, guard_level, guard_num, guard_unit, price, fans_medal_level, fans_medal_name, msg_id, ts, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (msg_id) DO NOTHING
    `, [
        generateSnowflakeId(),
        msg.roomId,
        msg.openId,
        msg.uname,
        msg.uface,
        msg.guardLevel,
        msg.guardNum,
        msg.guardUnit,
        msg.price,
        msg.fansMedalLevel,
        msg.fansMedalName,
        msg.msgId,
        msg.timestamp * 1000,
    ]);
}

export async function saveSuperChat(msg: SuperChatMessage) {
    await pool.query(`
        INSERT INTO super_chat (id, room_id, open_id, uname, uface, message_id, message, rmb, start_time, end_time, guard_level, fans_medal_level, fans_medal_name, msg_id, ts, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        ON CONFLICT (msg_id) DO NOTHING
    `, [
        generateSnowflakeId(),
        msg.roomId,
        msg.openId,
        msg.uname,
        msg.uface,
        msg.messageId,
        msg.message,
        msg.rmb,
        msg.startTime,
        msg.endTime,
        msg.guardLevel,
        msg.fansMedalLevel,
        msg.fansMedalName,
        msg.msgId,
        msg.timestamp * 1000,
    ]);
}

export async function saveLiveStatus(msg: LiveStatusMessage) {
    const ts = msg.timestamp * 1000;

    if (msg.isStart) {
        const previous = await pool.query<{ is_start: number; ts: string }>(
            'SELECT is_start, ts FROM live_status WHERE room_id = $1 ORDER BY ts DESC LIMIT 1',
            [msg.roomId],
        );

        if (previous.rows[0]?.is_start === 1) {
            const closeTs = Number(ts) - 1000;
            await pool.query(`
                INSERT INTO live_status (id, room_id, title, area_name, is_start, msg_id, ts, created_at)
                VALUES ($1, $2, '[自动关闭]', '', 0, $3, $4, NOW())
                ON CONFLICT DO NOTHING
            `, [
                generateSnowflakeId(),
                msg.roomId,
                `auto_close_${closeTs}`,
                closeTs,
            ]);
        }
    }

    await pool.query(`
        INSERT INTO live_status (id, room_id, title, area_name, is_start, msg_id, ts, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT DO NOTHING
    `, [
        generateSnowflakeId(),
        msg.roomId,
        msg.title,
        msg.areaName,
        msg.isStart ? 1 : 0,
        `live_status_${msg.roomId}_${ts}`,
        ts,
    ]);
}
