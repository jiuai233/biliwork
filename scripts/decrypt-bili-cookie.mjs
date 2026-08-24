/**
 * 把库里的 xor1:... Cookie 还原成明文。
 * 密钥优先 BILI_COOKIE_SECRET，否则 SESSION_SECRET。
 *
 *   BILI_COOKIE_SECRET=你的密钥 node scripts/decrypt-bili-cookie.mjs 'xor1:....'
 */
const PREFIX = 'xor1:';
const secret = (process.env.BILI_COOKIE_SECRET || process.env.SESSION_SECRET || '').trim();
const ciphertext = process.argv[2] || '';

if (!secret || !ciphertext.startsWith(PREFIX)) {
  console.error('用法: BILI_COOKIE_SECRET=密钥 node scripts/decrypt-bili-cookie.mjs \'xor1:...\'');
  process.exit(1);
}

const key = Buffer.from(secret, 'utf8');
const data = Buffer.from(ciphertext.slice(PREFIX.length), 'base64');
const out = Buffer.alloc(data.length);
for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
console.log(out.toString('utf8'));
