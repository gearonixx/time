import { createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode } from 'preact/compat';
import { load, save } from './storage';
import { runningDayKey, runningSchedule } from './schedule';
import {
  blocksOf,
  emptyDay,
  SCHEDULES,
  MAX_BLOCKS,
  type Database,
  type Day,
  type Goal,
  type Settings,
  type Slot,
  type SlotStatus,
} from './types';
type Action =
  | {
      type: 'setStatus';
      date: string;
      slot: number;
      status: SlotStatus;
      auto?: boolean;
    }
  | {
      type: 'cycleStatus';
      date: string;
      slot: number;
    }
  | {
      type: 'setNote';
      date: string;
      slot: number;
      note: string;
    }
  | {
      type: 'setWindow';
      date: string;
      which: 'top' | 'bottom';
      value: string;
    }
  | {
      type: 'addGoal';
      date: string;
      startSlot: number;
      label: string;
      detail?: string;
    }
  | {
      type: 'removeGoal';
      date: string;
      id: string;
    }
  | {
      type: 'setSettings';
      patch: Partial<Settings>;
    };
function touch(slot: Slot, auto = false): void {
  slot.updatedAt = Date.now();
  if (auto) slot.auto = true;
  else delete slot.auto;
}
function slotAt(day: Day, index: number): Slot {
  while (day.slots.length < index) {
    day.slots.push({ index: day.slots.length + 1, status: 'empty', note: '' });
  }
  return day.slots[index - 1];
}
const CYCLE: SlotStatus[] = ['empty', 'done', 'partial', 'skipped'];
function withDay(db: Database, date: string, fn: (day: Day) => void): Database {
  const existing = db.days[date] ?? emptyDay(date, db.settings.schedule);
  const day: Day = {
    ...existing,
    slots: existing.slots.map((s) => ({ ...s })),
    goals: existing.goals.map((g) => ({ ...g })),
  };
  fn(day);
  day.updatedAt = Date.now();
  day.goals.sort((a, b) => a.startSlot - b.startSlot);
  return { ...db, days: { ...db.days, [date]: day } };
}
function reducer(db: Database, action: Action): Database {
  switch (action.type) {
    case 'setStatus':
      return withDay(db, action.date, (d) => {
        const slot = slotAt(d, action.slot);
        slot.status = action.status;
        touch(slot, action.auto);
      });
    case 'cycleStatus':
      return withDay(db, action.date, (d) => {
        const slot = slotAt(d, action.slot);
        slot.status = CYCLE[(CYCLE.indexOf(slot.status) + 1) % CYCLE.length];
        touch(slot);
      });
    case 'setNote':
      return withDay(db, action.date, (d) => {
        const slot = slotAt(d, action.slot);
        slot.note = action.note;
        touch(slot);
      });
    case 'setWindow':
      return withDay(db, action.date, (d) => {
        if (action.which === 'top') d.windowTop = action.value;
        else d.windowBottom = action.value;
      });
    case 'addGoal':
      return withDay(db, action.date, (d) => {
        const startSlot = Math.min(Math.max(action.startSlot, 1), MAX_BLOCKS);
        const existing = d.goals.find((g) => g.startSlot === startSlot);
        if (existing) {
          existing.label = action.label;
          existing.detail = action.detail ?? existing.detail;
          return;
        }
        d.goals.push({
          id: `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          label: action.label,
          detail: action.detail ?? '',
          startSlot,
          color: d.goals.length % 6,
        } satisfies Goal);
      });
    case 'removeGoal':
      return withDay(db, action.date, (d) => {
        d.goals = d.goals.filter((g) => g.id !== action.id);
      });
    case 'setSettings': {
      const next = { ...db, settings: { ...db.settings, ...action.patch } };
      const id = action.patch.schedule;
      if (!id) return next;
      const key = runningDayKey(Date.now(), id);
      const day = next.days[key];
      if (!day) return next;
      const blocks = blocksOf(SCHEDULES[id]);
      if (day.slots.some((s, i) => i >= blocks && (s.status !== 'empty' || s.note))) return next;
      const slots = day.slots.map((s) => ({ ...s }));
      while (slots.length < blocks) {
        slots.push({ index: slots.length + 1, status: 'empty', note: '' });
      }
      return {
        ...next,
        days: { ...next.days, [key]: { ...day, schedule: id, slots, updatedAt: Date.now() } },
      };
    }
    default:
      return db;
  }
}
interface StoreValue {
  db: Database;
  dispatch: (action: Action) => void;
  activeDate: string;
  setActiveDate: (date: string) => void;
  day: Day;
  handle: string | null;
}
const StoreContext = createContext<StoreValue | null>(null);
export function StoreProvider({ handle, children }: { handle: string | null; children: ReactNode }) {
  const persistingReducer = useCallback(
    (db: Database, action: Action): Database => {
      const next = reducer(db, action);
      if (next === db) return db;
      save(handle, next);
      return next;
    },
    [handle],
  );
  const [db, dispatch] = useReducer(persistingReducer, handle, load);
  const [activeDate, setActiveDate] = useState(() => {
    const stored = load(handle);
    return runningDayKey(Date.now(), runningSchedule(stored.days, stored.settings.schedule));
  });
  const day = db.days[activeDate] ?? emptyDay(activeDate);
  const value = useMemo<StoreValue>(
    () => ({ db, dispatch, activeDate, setActiveDate, day, handle }),
    [db, activeDate, day, handle],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
