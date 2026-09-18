import { webcrypto as crypto } from 'node:crypto';
import fs from 'node:fs';
const [handle, source] = process.argv.slice(2);
const password = process.env.SEAL_PASSWORD;
if (!handle || !source || !password) throw new Error('usage: SEAL_PASSWORD=… node scripts/seal.mjs <handle> <db.json>');
const ITERATIONS = 250000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
  'deriveKey',
]);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
  material,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt'],
);
const plain = new TextEncoder().encode(fs.readFileSync(source, 'utf8'));
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
const b64 = (u) => Buffer.from(u).toString('base64');
fs.mkdirSync('public/seed', { recursive: true });
const out = `public/seed/${handle.toLowerCase()}.json`;
fs.writeFileSync(out, JSON.stringify({ iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(ct) }));
console.log(`sealed ${out}`);
