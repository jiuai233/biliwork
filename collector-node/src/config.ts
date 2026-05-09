import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const envSchema = z.object({
    DATABASE_URL: z.string().default('postgres://postgres:password@localhost:5432/biweb?sslmode=disable'),
    BILI_ACCESS_KEY_ID: z.string().default(''),
    BILI_ACCESS_KEY_SECRET: z.string().default(''),
    BILI_APP_ID: z.coerce.number().int().default(0),
});

export const env = envSchema.parse(process.env);
