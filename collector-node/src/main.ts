import cron from 'node-cron';
import { closeDb, connectDb } from './db.js';
import { runArchive } from './jobs/archive.js';
import { logger } from './logger.js';
import { CollectorManager } from './manager.js';
import { initSnowflake } from './snowflake.js';

async function main() {
    await connectDb();
    initSnowflake(1);
    logger.info('Snowflake ID generator initialized');

    const manager = new CollectorManager();

    cron.schedule('0 3 * * 1', () => {
        logger.info('Starting Weekly Data Archiving');
        runArchive().catch((error) => logger.error({ error }, 'Archive failed'));
    }, { timezone: 'Asia/Shanghai' });
    logger.info('Cron scheduler started (Archive: Monday 3 AM)');

    cron.schedule('30 4 */3 * *', () => {
        logger.info('Scheduled reconnection triggered');
        manager.restartAll().catch((error) => logger.error({ error }, 'Scheduled restart failed'));
    }, { timezone: 'Asia/Shanghai' });
    logger.info('Scheduled restart: every 3 days at 4:30 AM');

    manager.start();
    logger.info('Bi-Collector (Node) Started');

    const shutdown = async () => {
        logger.info('Shutting down');
        manager.stop();
        await closeDb();
        process.exit(0);
    };

    process.once('SIGINT', () => void shutdown());
    process.once('SIGTERM', () => void shutdown());
}

main().catch((error) => {
    logger.fatal({ error }, 'Collector crashed');
    process.exit(1);
});
