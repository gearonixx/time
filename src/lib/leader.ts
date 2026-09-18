const LOCK = 'timeforces:announcer';
const LEASE_KEY = 'timeforces:announcer:lease';
const BEAT_MS = 1000;
const STALE_MS = 3500;
const SETTLE_MS = 80;
let speaking = false;
let started = false;
const listeners = new Set<(mine: boolean) => void>();
function announce(next: boolean): void {
  if (next === speaking) return;
  speaking = next;
  for (const fn of listeners) fn(next);
}
export function isAnnouncer(): boolean {
  return speaking;
}
export function onAnnouncerChange(fn: (mine: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function viaLocks(): void {
  void navigator.locks
    .request(LOCK, () => {
      announce(true);
      return new Promise<void>(() => {});
    })
    .catch(() => viaLease());
}
function viaLease(): void {
  const me = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const read = (): {
    id: string;
    at: number;
  } | null => {
    try {
      return JSON.parse(localStorage.getItem(LEASE_KEY) ?? 'null');
    } catch {
      return null;
    }
  };
  const write = (): boolean => {
    try {
      localStorage.setItem(LEASE_KEY, JSON.stringify({ id: me, at: Date.now() }));
      return true;
    } catch {
      return false;
    }
  };
  const beat = () => {
    const held = read();
    if (held?.id === me) {
      if (!write()) announce(true);
      else announce(true);
      return;
    }
    const stale = !held || Date.now() - held.at > STALE_MS;
    if (!stale) {
      announce(false);
      return;
    }
    if (!write()) {
      announce(true);
      return;
    }
    announce(false);
    setTimeout(() => {
      if (read()?.id === me) announce(true);
    }, SETTLE_MS);
  };
  beat();
  setInterval(beat, BEAT_MS);
  window.addEventListener('pagehide', () => {
    if (read()?.id === me) {
      try {
        localStorage.removeItem(LEASE_KEY);
      } catch {}
    }
  });
}
const CANONICAL_HOST = 'timeforces.vercel.app';
function mayAnnounce(): boolean {
  if (typeof location === 'undefined') return false;
  if (location.protocol === 'moz-extension:' || location.protocol === 'chrome-extension:') {
    return true;
  }
  const host = location.hostname;
  return host === CANONICAL_HOST || host === 'localhost' || host === '127.0.0.1';
}
export function electAnnouncer(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (!mayAnnounce()) return;
  if (typeof navigator.locks?.request === 'function') viaLocks();
  else viaLease();
}
