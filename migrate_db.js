const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Try to find the database
// In production (built), it might be in different places relative to the script
// We'll try user's known path structure
const possiblePaths = [
    process.env.DB_FILE_PATH,
    path.resolve('../collect/data/collector.db'),
    path.resolve('../../collect/data/collector.db'),
    path.resolve('./data/collector.db'),
    '../collect/data/collector.db'
];

let dbPath = null;
for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
        dbPath = p;
        break;
    }
}

if (!dbPath) {
    console.error('[Error] Could not find database file.');
    console.log('Searched in:', possiblePaths);
    process.exit(1);
}

console.log(`[Migration] Found database at: ${dbPath}`);

try {
    const db = new Database(dbPath);

    // Check broadcasters table
    const tableInfo = db.pragma('table_info(broadcasters)');
    const hasPasswordHash = tableInfo.some(col => col.name === 'password_hash');

    if (hasPasswordHash) {
        console.log('[Info] Column "password_hash" already exists. No action needed.');
    } else {
        console.log('[Migration] Adding "password_hash" column...');
        db.prepare('ALTER TABLE broadcasters ADD COLUMN password_hash TEXT').run();
        console.log('[Success] Migration completed.');
    }

} catch (err) {
    console.error('[Error] Migration failed:', err.message);
}
