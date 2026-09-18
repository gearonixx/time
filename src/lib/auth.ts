import { isSealed, openSeed } from './seed';
import { load, save } from './storage';
const ACCOUNTS_KEY = 'time:accounts:v1';
const SESSION_KEY = 'time:session:v1';
const LEGACY = {
  accounts: ['hours:accounts:v1', 'timeforces:accounts:v1'],
  session: ['hours:session:v1', 'timeforces:session:v1'],
};
function read(key: string, legacy: string[]): string | null {
  let raw = localStorage.getItem(key);
  for (const old of legacy) raw ??= localStorage.getItem(old);
  return raw;
}
export interface Account {
  handle: string;
  hash: string;
  createdAt: number;
}
function idOf(handle: string): string {
  return handle.trim().toLowerCase();
}
function hash(handle: string, password: string): string {
  const input = `timeforces:${idOf(handle)}:${password}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
function readAccounts(): Record<string, Account> {
  try {
    const raw = read(ACCOUNTS_KEY, LEGACY.accounts);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, Account>) : {};
  } catch {
    return {};
  }
}
function writeAccounts(accounts: Record<string, Account>): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {}
}
export function currentHandle(): string | null {
  try {
    const raw = read(SESSION_KEY, LEGACY.session);
    return raw ? raw : null;
  } catch {
    return null;
  }
}
export async function signIn(
  handle: string,
  password: string,
): Promise<
  | {
      ok: true;
      handle: string;
      created: boolean;
    }
  | {
      ok: false;
      error: string;
    }
> {
  const id = idOf(handle);
  if (!/^[a-z0-9][a-z0-9-]{0,38}$/.test(id)) {
    return { ok: false, error: 'Handle: letters, digits and dashes.' };
  }
  if (!password) return { ok: false, error: 'Password required.' };
  const accounts = readAccounts();
  const existing = accounts[id];
  let created = !existing;
  const seed = isSealed(id) ? await openSeed(id, password) : 'offline';
  if (seed === 'wrong') return { ok: false, error: 'Wrong password.' };
  if (seed !== 'offline') {
    const db = load(id);
    for (const [date, day] of Object.entries(seed.days)) db.days[date] ??= day;
    save(id, db);
    accounts[id] = { handle: id, hash: hash(id, password), createdAt: existing?.createdAt ?? Date.now() };
    writeAccounts(accounts);
    created = false;
  } else if (existing) {
    if (existing.hash !== hash(id, password)) return { ok: false, error: 'Wrong password.' };
  } else if (isSealed(id)) {
    return { ok: false, error: 'No connection.' };
  } else {
    accounts[id] = { handle: id, hash: hash(id, password), createdAt: Date.now() };
    writeAccounts(accounts);
  }
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {}
  return { ok: true, handle: id, created };
}
