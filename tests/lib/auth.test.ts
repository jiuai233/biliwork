import { login, logout, getSession, requireAuth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getBroadcasterByUidAndCode } from '@/lib/data';
import { getIronSession } from 'iron-session';

// Mock dependencies
jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('next/navigation', () => ({
    redirect: jest.fn(),
}));

jest.mock('@/lib/data', () => ({
    getBroadcasterByUidAndCode: jest.fn(),
}));

// Mock iron-session
const mockSession: any = {
    uid: undefined,
    isLoggedIn: false,
    save: jest.fn(),
    destroy: jest.fn(),
};

jest.mock('iron-session', () => ({
    getIronSession: jest.fn(() => mockSession),
}));

describe('Auth (iron-session)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSession.uid = undefined;
        mockSession.isLoggedIn = false;
        mockSession.save = jest.fn();
        mockSession.destroy = jest.fn();
        (cookies as jest.Mock).mockResolvedValue({});
    });

    describe('login', () => {
        it('should save session and return true for valid credentials', async () => {
            (getBroadcasterByUidAndCode as jest.Mock).mockReturnValue({ uid: 123 });

            const result = await login(123, 'valid-code');

            expect(getBroadcasterByUidAndCode).toHaveBeenCalledWith(123, 'valid-code');
            expect(mockSession.uid).toBe(123);
            expect(mockSession.isLoggedIn).toBe(true);
            expect(mockSession.save).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should return false for invalid credentials', async () => {
            (getBroadcasterByUidAndCode as jest.Mock).mockReturnValue(undefined);

            const result = await login(123, 'invalid-code');

            expect(mockSession.save).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe('logout', () => {
        it('should destroy session and redirect', async () => {
            await logout();

            expect(mockSession.destroy).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalledWith('/login');
        });
    });

    describe('getSession', () => {
        it('should return uid if session is logged in', async () => {
            mockSession.isLoggedIn = true;
            mockSession.uid = 123;

            const uid = await getSession();

            expect(uid).toBe(123);
        });

        it('should return null if session is not logged in', async () => {
            mockSession.isLoggedIn = false;

            const uid = await getSession();

            expect(uid).toBeNull();
        });
    });

    describe('requireAuth', () => {
        it('should return uid if session exists', async () => {
            mockSession.isLoggedIn = true;
            mockSession.uid = 123;

            const uid = await requireAuth();

            expect(uid).toBe(123);
        });

        it('should redirect if session does not exist', async () => {
            mockSession.isLoggedIn = false;

            try {
                await requireAuth();
            } catch (e) {
                // redirect throws in Next.js
            }

            expect(redirect).toHaveBeenCalledWith('/login');
        });
    });
});
