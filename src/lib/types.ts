export const SLOTS_PER_DAY = 10;
export type ScheduleId = 'standard' | 'experimental';
export interface DayShape {
  id: ScheduleId;
  label: string;
  rounds: number[];
  bridges: number[];
  intensive: number[];
  ends: string;
  hint: string;
}
export const SCHEDULES: Record<ScheduleId, DayShape> = {
  standard: {
    id: 'standard',
    label: 'Standard',
    rounds: [5, 5],
    bridges: [30],
    intensive: [],
    ends: '21:50',
    hint: 'Ten blocks, two rounds of five.',
  },
  experimental: {
    id: 'experimental',
    label: 'Long day',
    rounds: [5, 5, 4, 4],
    bridges: [30, 20, 10],
    intensive: [4],
    ends: '07:20',
    hint: 'Eighteen blocks: the standard day, then two rounds through the night.',
  },
};
export function blocksOf(shape: DayShape): number {
  return shape.rounds.reduce((n, s) => n + s, 0);
}
export function boundariesOf(shape: DayShape): number[] {
  const out: number[] = [];
  let n = 0;
  for (const round of shape.rounds.slice(0, -1)) {
    n += round;
    out.push(n);
  }
  return out;
}
export interface BlockPlace {
  round: number;
  index: number;
  of: number;
  rounds: number;
}
export function placeOf(rounds: number[], block: number): BlockPlace {
  let seen = 0;
  for (let i = 0; i < rounds.length; i++) {
    if (block <= seen + rounds[i]) {
      return { round: i + 1, index: block - seen, of: rounds[i], rounds: rounds.length };
    }
    seen += rounds[i];
  }
  const last = Math.max(0, rounds.length - 1);
  return { round: rounds.length, index: rounds[last] ?? 0, of: rounds[last] ?? 0, rounds: rounds.length };
}
export function roundStart(shape: DayShape, round: number): number {
  return shape.rounds.slice(0, round - 1).reduce((n, s) => n + s, 0) + 1;
}
export const MAX_BLOCKS = Math.max(...Object.values(SCHEDULES).map(blocksOf));
export function shapeOf(day: Pick<Day, 'schedule'> | undefined, fallback: ScheduleId = 'standard'): DayShape {
  return SCHEDULES[day?.schedule ?? fallback] ?? SCHEDULES.standard;
}
export type SlotStatus = 'empty' | 'done' | 'partial' | 'skipped';
export const STATUS_HOURS: Record<SlotStatus, number> = {
  empty: 0,
  done: 1,
  partial: 0.5,
  skipped: 0,
};
export const LAPSE_MS = 60 * 60 * 1000;
export interface Slot {
  index: number;
  status: SlotStatus;
  note: string;
  updatedAt?: number;
  auto?: boolean;
}
export interface Goal {
  id: string;
  label: string;
  detail: string;
  startSlot: number;
  color: number;
}
export interface Day {
  date: string;
  schedule?: ScheduleId;
  goals: Goal[];
  windowTop: string;
  windowBottom: string;
  slots: Slot[];
  updatedAt: number;
}
export interface Settings {
  schedule: ScheduleId;
  dailyGoal: number;
  notifications: boolean;
  sound: boolean;
}
export interface Database {
  version: number;
  days: Record<string, Day>;
  settings: Settings;
}
export const DATABASE_VERSION = 5;
export const DEFAULT_SETTINGS: Settings = {
  schedule: 'experimental',
  dailyGoal: 18,
  notifications: true,
  sound: true,
};
export function emptySlots(blocks = SLOTS_PER_DAY): Slot[] {
  return Array.from({ length: blocks }, (_, i) => ({
    index: i + 1,
    status: 'empty' as SlotStatus,
    note: '',
  }));
}
export function emptyDay(date: string, schedule: ScheduleId = 'standard'): Day {
  return {
    date,
    ...(schedule === 'standard' ? {} : { schedule }),
    goals: [],
    windowTop: '',
    windowBottom: '',
    slots: emptySlots(blocksOf(SCHEDULES[schedule])),
    updatedAt: Date.now(),
  };
}
export function emptyDatabase(): Database {
  return {
    version: DATABASE_VERSION,
    days: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}
export function dayHours(day: Day): number {
  return day.slots.reduce((sum, s) => sum + (STATUS_HOURS[s.status] ?? 0), 0);
}
