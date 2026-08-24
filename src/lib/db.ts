import 'server-only';
import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

function resolvePrisma(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing && typeof existing.giftInvite !== 'undefined') {
    return existing;
  }
  if (existing) void existing.$disconnect();
  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = resolvePrisma();

// Legacy support - getDb() returns prisma for backwards compatibility
// This allows gradual migration
export function getDb() {
  return prisma;
}
