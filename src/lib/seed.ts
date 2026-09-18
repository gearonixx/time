import type { Database } from './types';
import { normalize } from './storage';
const SEALED = new Set(['gearonixx']);
export function isSealed(id: string): boolean {
  return SEALED.has(id);
}
const bytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
export async function openSeed(id: string, password: string): Promise<Database | 'wrong' | 'offline'> {
  let sealed: {
    iterations: number;
    salt: string;
    iv: string;
    data: string;
  };
  try {
    const res = await fetch(`/seed/${id}.json`, { cache: 'no-store' });
    if (!res.ok) return 'offline';
    sealed = await res.json();
  } catch {
    return 'offline';
  }
  try {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
      'deriveKey',
    ]);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: bytes(sealed.salt), iterations: sealed.iterations },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(sealed.iv) }, key, bytes(sealed.data));
    return normalize(JSON.parse(new TextDecoder().decode(plain)));
  } catch {
    return 'wrong';
  }
}
