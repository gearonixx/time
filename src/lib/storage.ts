import {
  DEFAULT_SETTINGS,
  emptyDatabase,
  emptySlots,
  blocksOf,
  DATABASE_VERSION,
  MAX_BLOCKS,
  SCHEDULES,
  SLOTS_PER_DAY,
  STATUS_HOURS,
  type Database,
  type Day,
  type Goal,
  type SlotStatus,
} from './types';
const KEY = 'time:db:v1';
const LEGACY_KEYS = ['hours:db:v1', 'timeforces:db:v1'];
function keyFor(handle: string | null, key = KEY): string {
  return handle ? `${key}:${handle.toLowerCase()}` : key;
}
export function normalize(raw: unknown): Database {
  const base = emptyDatabase();
  if (!raw || typeof raw !== 'object') return base;
  const input = raw as Partial<Database>;
  const days: Record<string, Day> = {};
  for (const [key, value] of Object.entries(input.days ?? {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !value || typeof value !== 'object') continue;
    const d = value as Partial<Day>;
    const schedule = d.schedule && SCHEDULES[d.schedule] ? d.schedule : undefined;
    const slots = emptySlots(schedule ? blocksOf(SCHEDULES[schedule]) : SLOTS_PER_DAY);
    for (const s of d.slots ?? []) {
      const i = Number(s?.index);
      if (!Number.isInteger(i) || i < 1 || i > MAX_BLOCKS) continue;
      const note = typeof s.note === 'string' ? s.note : '';
      const stored = (s.status ?? 'empty') as SlotStatus;
      const status: SlotStatus = stored in STATUS_HOURS ? stored : 'empty';
      while (slots.length < i) slots.push({ index: slots.length + 1, status: 'empty', note: '' });
      slots[i - 1] = { index: i, status, note };
      if (Number.isFinite(Number(s.updatedAt))) slots[i - 1].updatedAt = Number(s.updatedAt);
      if (s.auto === true) slots[i - 1].auto = true;
    }
    const goals: Goal[] = (d.goals ?? [])
      .filter((g) => g && typeof g.label === 'string')
      .map((g, n) => ({
        id: g.id || `g${n}-${key}`,
        label: g.label,
        detail: typeof g.detail === 'string' ? g.detail : '',
        startSlot: Math.min(Math.max(Number(g.startSlot) || 1, 1), MAX_BLOCKS),
        color: Number.isInteger(g.color) ? g.color : 0,
      }))
      .sort((a, b) => a.startSlot - b.startSlot);
    const shape = schedule ?? (slots.length > SLOTS_PER_DAY ? ('experimental' as const) : undefined);
    days[key] = {
      date: key,
      ...(shape ? { schedule: shape } : {}),
      goals,
      windowTop: typeof d.windowTop === 'string' ? d.windowTop : '',
      windowBottom: typeof d.windowBottom === 'string' ? d.windowBottom : '',
      slots,
      updatedAt: Number(d.updatedAt) || Date.now(),
    };
  }
  const settings = { ...DEFAULT_SETTINGS, ...(input.settings ?? {}) };
  settings.dailyGoal = Math.min(Math.max(Number(settings.dailyGoal) || SLOTS_PER_DAY, 1), MAX_BLOCKS);
  settings.schedule = 'experimental';
  return { version: DATABASE_VERSION, days, settings };
}
export function load(handle: string | null): Database {
  try {
    let raw = localStorage.getItem(keyFor(handle));
    for (const legacy of LEGACY_KEYS) raw ??= localStorage.getItem(keyFor(handle, legacy));
    if (!raw) return emptyDatabase();
    return normalize(JSON.parse(raw));
  } catch {
    return emptyDatabase();
  }
}
export function save(handle: string | null, db: Database): void {
  try {
    localStorage.setItem(keyFor(handle), JSON.stringify(db));
  } catch (err) {
    console.error('time: could not persist to localStorage', err);
  }
}
