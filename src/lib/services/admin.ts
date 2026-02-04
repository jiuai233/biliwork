import 'server-only';
import { prisma } from '@/lib/db';

// Admin User Types
export interface AdminUser {
    id: number;
    username: string;
    password_hash: string;
}

// Admin Management
export async function getAdminUser(username: string): Promise<AdminUser | null> {
    const user = await prisma.adminUser.findUnique({
        where: { username }
    });

    if (!user) return null;

    return {
        id: user.id,
        username: user.username,
        password_hash: user.passwordHash
    };
}

export async function createAdminUser(username: string, passwordHash: string): Promise<boolean> {
    try {
        await prisma.adminUser.create({
            data: {
                username,
                passwordHash,
                createdAt: BigInt(Date.now())
            }
        });
        return true;
    } catch (e) {
        console.error('Create admin failed:', e);
        return false;
    }
}

export async function updateAdminPassword(username: string, passwordHash: string): Promise<boolean> {
    try {
        const result = await prisma.adminUser.updateMany({
            where: { username },
            data: { passwordHash }
        });
        return result.count > 0;
    } catch (e) {
        console.error('Update admin password failed:', e);
        return false;
    }
}
