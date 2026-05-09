-- BiWeb 数据库分区方案
-- 适用于弹幕和礼物表，按月分区以应对大数据量
--
-- 注意：此 SQL 需要在生产数据库上手动执行
-- 执行前请先备份数据
--
-- ==================== 弹幕表按月分区 ====================
-- 
-- PostgreSQL 分区表需要重建原表。步骤：
-- 1. 将原表重命名
-- 2. 创建新的分区父表
-- 3. 将数据迁移到分区表
-- 4. 删除旧表
--
-- 由于 Prisma 不原生支持分区，这里提供手动 SQL 方案。
-- 在数据量未达到百万级之前，索引已经足够应对查询性能。
-- 当单表超过 500 万行时再考虑执行此分区方案。

-- ==================== 方案 A：自动创建月度分区 ====================

-- 创建自动分区函数
CREATE OR REPLACE FUNCTION create_monthly_partition(
    parent_table TEXT,
    partition_date DATE
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    start_date := date_trunc('month', partition_date);
    end_date := start_date + INTERVAL '1 month';
    partition_name := parent_table || '_' || to_char(start_date, 'YYYY_MM');
    
    -- 检查分区是否已存在
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables WHERE tablename = partition_name
    ) THEN
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
            partition_name, parent_table,
            extract(epoch from start_date) * 1000,
            extract(epoch from end_date) * 1000
        );
        RAISE NOTICE 'Created partition: %', partition_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==================== 方案 B：弹幕表分区示例 ====================

-- 步骤 1: 重命名旧表
-- ALTER TABLE danmaku RENAME TO danmaku_old;

-- 步骤 2: 创建分区父表（结构与原表相同）
-- CREATE TABLE danmaku (
--     id BIGINT NOT NULL,
--     room_id INTEGER NOT NULL,
--     open_id TEXT,
--     uname TEXT,
--     uface TEXT,
--     msg TEXT,
--     msg_id TEXT,
--     dm_type INTEGER DEFAULT 0,
--     emoji_img_url TEXT,
--     fans_medal_level INTEGER DEFAULT 0,
--     fans_medal_name TEXT,
--     guard_level INTEGER DEFAULT 0,
--     ts BIGINT NOT NULL,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     PRIMARY KEY (id, ts)
-- ) PARTITION BY RANGE (ts);

-- 步骤 3: 为过去几个月创建分区
-- SELECT create_monthly_partition('danmaku', '2026-01-01'::DATE);
-- SELECT create_monthly_partition('danmaku', '2026-02-01'::DATE);
-- SELECT create_monthly_partition('danmaku', '2026-03-01'::DATE);
-- SELECT create_monthly_partition('danmaku', '2026-04-01'::DATE);

-- 步骤 4: 迁移数据
-- INSERT INTO danmaku SELECT * FROM danmaku_old;

-- 步骤 5: 验证数据量
-- SELECT count(*) FROM danmaku;
-- SELECT count(*) FROM danmaku_old;

-- 步骤 6: 确认无误后删除旧表
-- DROP TABLE danmaku_old;

-- ==================== 定期维护：自动创建下月分区 ====================
-- 建议通过 cron 或 pg_cron 每月自动执行：
-- SELECT create_monthly_partition('danmaku', NOW()::DATE + INTERVAL '1 month');
-- SELECT create_monthly_partition('gift', NOW()::DATE + INTERVAL '1 month');
