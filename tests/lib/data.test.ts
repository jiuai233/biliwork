import Database from 'better-sqlite3';
import {
    createAdminUser,
    getAdminUser,
    updateAdminPassword,
    addBroadcaster,
    getAllBroadcasters,
    getBroadcasterByUidAndCode
} from '@/lib/data';
import { getDb } from '@/lib/db';

// Mock getDb to return our in-memory test database
jest.mock('@/lib/db', () => {
    // We keep a reference to the DB instance so we can close/reset it if needed,
    // but primarily we just want a fresh one for the suite or allow it to persist.
    // For simplicity in this test file, let's create one global in-memory db.
    const db = new Database(':memory:');

    // Initialize Schema
    db.exec(`
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS broadcasters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uid INTEGER,
            auth_code TEXT,
            active INTEGER DEFAULT 1,
            password_hash TEXT,
            room_id INTEGER,
            created_at INTEGER,
            updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS danmaku (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER,
            uid INTEGER,
            uname TEXT,
            text TEXT,
            ts INTEGER,
            uface TEXT
        );
        CREATE TABLE IF NOT EXISTS gift (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER,
            uid INTEGER,
            uname TEXT,
            uface TEXT,
            gift_name TEXT,
            gift_num INTEGER,
            r_price INTEGER,
            ts INTEGER,
            gift_icon TEXT
        );
        CREATE TABLE IF NOT EXISTS guard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER,
            uid INTEGER,
            uname TEXT,
            uface TEXT,
            guard_level INTEGER,
            guard_num INTEGER,
            guard_unit TEXT,
            price INTEGER,
            ts INTEGER
        );
        CREATE TABLE IF NOT EXISTS super_chat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER,
            uid INTEGER,
            uname TEXT,
            uface TEXT,
            message TEXT,
            rmb INTEGER,
            ts INTEGER
        );
    `);

    return {
        getDb: jest.fn(() => db),
    };
});

describe('Data Layer', () => {
    const db = getDb();

    beforeEach(() => {
        // Clear tables before each test
        db.prepare('DELETE FROM admin_users').run();
        db.prepare('DELETE FROM broadcasters').run();
        db.prepare('DELETE FROM danmaku').run();
        db.prepare('DELETE FROM gift').run();
        db.prepare('DELETE FROM guard').run();
        db.prepare('DELETE FROM super_chat').run();
    });

    describe('Admin User', () => {
        it('should create and retrieve an admin user', () => {
            const success = createAdminUser('admin', 'hash123');
            expect(success).toBe(true);

            const user = getAdminUser('admin');
            expect(user).toBeDefined();
            expect(user?.username).toBe('admin');
            expect(user?.password_hash).toBe('hash123');
        });

        it('should update admin password', () => {
            createAdminUser('admin', 'oldhash');
            const success = updateAdminPassword('admin', 'newhash');
            expect(success).toBe(true);

            const user = getAdminUser('admin');
            expect(user?.password_hash).toBe('newhash');
        });
    });

    describe('Broadcaster Management', () => {
        it('should add a broadcaster', () => {
            const success = addBroadcaster('auth-code-123', 1);
            expect(success).toBe(true);

            const list = getAllBroadcasters();
            expect(list).toHaveLength(1);
            expect(list[0].auth_code).toBe('auth-code-123');
        });

        it('should get broadcaster by uid and code', () => {
            // First insert manually or via addBroadcaster if it supported uid setting
            // addBroadcaster only takes authCode, active, hash. 
            // It doesn't take UID! 
            // The `collect` service presumably fills the UID later using `UPDATE`.
            // So we must manually insert a record with UID to test `getBroadcasterByUidAndCode`

            db.prepare('INSERT INTO broadcasters (uid, auth_code, active) VALUES (?, ?, ?)')
                .run(1001, 'secret-code', 1);

            const broadcaster = getBroadcasterByUidAndCode(1001, 'secret-code');
            expect(broadcaster).toBeDefined();
            expect(broadcaster?.uid).toBe(1001);
        });
    });
});
