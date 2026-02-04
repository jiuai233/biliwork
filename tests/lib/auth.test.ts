import { login, logout, getSession, requireAuth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getBroadcasterByUidAndCode } from '@/lib/data';

// Mock dependencie
jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('next/navigation', () => ({
    redirect: jest.fn(),
}));

jest.mock('@/lib/data', () => ({
    getBroadcasterByUidAndCode: jest.fn(),
}));

describe('Auth', () => {
    let mockCookieStore: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockCookieStore = {
            set: jest.fn(),
            delete: jest.fn(),
            get: jest.fn(),
        };
        (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
    });

    describe('login', () => {
        it('should set cookie and return true for valid credentials', async () => {
            (getBroadcasterByUidAndCode as jest.Mock).mockReturnValue({ uid: 123 });

            const result = await login(123, 'valid-code');

            expect(getBroadcasterByUidAndCode).toHaveBeenCalledWith(123, 'valid-code');
            expect(mockCookieStore.set).toHaveBeenCalledWith(
                'auth_session',
                '123',
                expect.objectContaining({ httpOnly: true })
            );
            expect(result).toBe(true);
        });

        it('should return false for invalid credentials', async () => {
            (getBroadcasterByUidAndCode as jest.Mock).mockReturnValue(undefined);

            const result = await login(123, 'invalid-code');

            expect(mockCookieStore.set).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe('logout', () => {
        it('should delete cookie and redirect', async () => {
            await logout();

            expect(mockCookieStore.delete).toHaveBeenCalledWith('auth_session');
            expect(redirect).toHaveBeenCalledWith('/login');
        });
    });

    describe('getSession', () => {
        it('should return uid if cookie exists', async () => {
            mockCookieStore.get.mockReturnValue({ value: '123' });

            const uid = await getSession();

            expect(uid).toBe(123);
        });

        it('should return null if cookie does not exist', async () => {
            mockCookieStore.get.mockReturnValue(undefined);

            const uid = await getSession();

            expect(uid).toBeNull();
        });
    });

    describe('requireAuth', () => {
        it('should return uid if session exists', async () => {
            mockCookieStore.get.mockReturnValue({ value: '123' });

            const uid = await requireAuth();

            expect(uid).toBe(123);
        });

        it('should redirect if session does not exist', async () => {
            mockCookieStore.get.mockReturnValue(undefined);

            try {
                await requireAuth();
            } catch (e) {
                // redirect throws an error in Next.js, so catch it (or mock it to not throw)
            }

            expect(redirect).toHaveBeenCalledWith('/login');
        });
    });
});
