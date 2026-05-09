import pg from 'pg';
import { env } from './config.js';
import { logger } from './logger.js';

const { Pool } = pg;

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    min: 2,
    maxLifetimeSeconds: 3600,
});

export async function connectDb() {
    await pool.query('SELECT 1');
    logger.info('Connected to PostgreSQL');
}

export async function closeDb() {
    await pool.end();
}
