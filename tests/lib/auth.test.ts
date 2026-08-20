import { login, logout, getSession, requireAuth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getBroadcasterByUidAndCode, getBroadcasterByUidForLogin } from '@/lib/data';
import bcrypt from 'bcryptjs';

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('next/navigation', () => ({
    redirect: jest.fn(),
}));

jest.mock('@/lib/data', () => ({
    getBroadcasterByUidAndCode: jest.fn(),
    getBroadcasterByUidForLogin: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
}));

const mockSession: any = {
    uid: undefined,
    isLoggedIn: false,
    pwdv: undefined,
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
        mockSession.pwdv = undefined;
        mockSession.save = jest.fn();
        mockSession.destroy = jest.fn();
        (cookies as jest.Mock).mockResolvedValue({});
    });

    describe('login', () => {
        it('saves session for a valid password (bcrypt path)', async () => {
            (getBroadcasterByUidForLogin as jest.Mock).mockResolvedValue({ uid: 123, password_hash: 'hash' });
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await login(123, 'valid-password');

            expect(bcrypt.compare).toHaveBeenCalledWith('valid-password', 'hash');
            expect(mockSession.uid).toBe(123);
            expect(mockSession.isLoggedIn).toBe(true);
            expect(mockSession.pwdv).toBe('hash');
            expect(mockSession.save).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('rejects an invalid password (bcrypt path)', async () => {
            (getBroadcasterByUidForLogin as jest.Mock).mockResolvedValue({ uid: 123, password_hash: 'hash' });
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            const result = await login(123, 'wrong-password');

            expect(mockSession.save).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it('falls back to auth-code login when no password_hash exists', async () => {
            (getBroadcasterByUidForLogin as jest.Mock).mockResolvedValue({ uid: 123, password_hash: null });
            (getBroadcasterByUidAndCode as jest.Mock).mockResolvedValue({ uid: 123 });

            const result = await login(123, 'auth-code');

            expect(getBroadcasterByUidAndCode).toHaveBeenCalledWith(123, 'auth-code');
            expect(mockSession.pwdv).toBe('');
            expect(mockSession.save).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('returns false for an unknown uid', async () => {
            (getBroadcasterByUidForLogin as jest.Mock).mockResolvedValue(null);
            (getBroadcasterByUidAndCode as jest.Mock).mockResolvedValue(null);

            const result = await login(123, 'anything');

            expect(mockSession.save).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe('logout', () => {
        it('destroys session and redirects', async () => {
            await logout();

            expect(mockSession.destroy).toHaveBeenCalled();
            expect(redirect).toHaveBeenCalledWith('/login');
        });
    });

    describe('getSession', () => {
        it('returns uid if session stamp matches current password', async () => {
            mockSession.isLoggedIn = true;
            mockSession.uid = 123;
            mockSession.pwdv = 'hash';
            (getBroadcasterByUidForLogin as jest.Mock).mockResolvedValue({ uid: 123, password_hash: 'hash' });

            expect(await getSession()).toBe(123);
        });

        it('returns null after password change', async () => {
            mockSession.isLoggedIn = true;
            mockSession.uid = 123;
            mockSession.pwdv = 'old-password-hash';
            (getBroadcasterByUidForLogin as jest.Mock).mockResolvedValue({ uid: 123, password_hash: 'new-password-hash' });

            expect(await getSession()).toBeNull();
        });

        it('returns null if session is not logged in', async () => {
            mockSession.isLoggedIn = false;

            expect(await getSession()).toBeNull();
        });
    });

    describe('requireAuth', () => {
        it('returns uid if session exists', async () => {
            mockSession.isLoggedIn = true;
            mockSession.uid = 123;
            mockSession.pwdv = 'hash';
            (getBroadcasterByUidForLogin as jest.Mock).mockResolvedValue({ uid: 123, password_hash: 'hash' });

            expect(await requireAuth()).toBe(123);
        });

        it('redirects if session does not exist', async () => {
            mockSession.isLoggedIn = false;

            await requireAuth();

            expect(redirect).toHaveBeenCalledWith('/login');
        });
    });
});
