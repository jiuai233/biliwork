const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// Configuration
const dbPath = path.resolve('../collect/data/collector.db');
const targetUser = 'admin';
const newPassword = 'admin'; // Default reset password

console.log(`[Reset] Connecting to database at: ${dbPath}`);

try {
    const db = new Database(dbPath, { fileMustExist: true });

    // Check if user exists
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(targetUser);

    if (!user) {
        console.error(`[Error] User '${targetUser}' not found.`);
        console.log('Available users:', db.prepare('SELECT username FROM admin_users').all());
        process.exit(1);
    }

    // Hash new password
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);

    // Update
    const result = db.prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?').run(hash, targetUser);

    console.log(`[Success] Password for '${targetUser}' has been reset to: '${newPassword}'`);
    console.log(`[Info] Rows affected: ${result.changes}`);

} catch (err) {
    console.error('[Error]', err.message);
}
