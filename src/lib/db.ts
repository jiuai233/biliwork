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

function hasGiftInvite(client: PrismaClient) {
  return typeof (client as PrismaClient & { giftInvite?: unknown }).giftInvite !== 'undefined';
}

function getPrisma(): PrismaClient {
  const current = globalForPrisma.prisma;
  if (current && hasGiftInvite(current)) return current;
  if (current) void current.$disconnect();
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, client) as unknown;
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

// Legacy support - getDb() returns prisma for backwards compatibility
// This allows gradual migration
export function getDb() {
  return prisma;
}
