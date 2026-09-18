import { useEffect, useRef, useState } from 'preact/compat';
import { scheduleAt, type ScheduleNow } from './schedule';
import { dueAt, isFresh, MARK_MS, TICK_MS, TICKS_PER_PART } from './announce';
import { chime, primeAudio } from './chime';
import { electAnnouncer, isAnnouncer, onAnnouncerChange } from './leader';
import type { ScheduleId } from './types';
let showing: Notification | null = null;
function notify(title: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const options: NotificationOptions = {
    icon: `${import.meta.env.BASE_URL}favicon.svg`,
    tag: `time:${Date.now()}`,
  };
  try {
    showing?.close();
    showing = new Notification(title, options);
  } catch {
    void navigator.serviceWorker?.ready.then((reg) => reg.showNotification(title, options)).catch(() => {});
  }
}
function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return Promise.resolve('denied');
  if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
  return Notification.requestPermission();
}
export interface TimerApi {
  now: ScheduleNow;
}
interface Measures {
  parts: number;
  part: number;
  partRemaining: number;
  ticks: number;
  tick: number;
  tickRemaining: number;
}
export function measuresAt(now: ScheduleNow, at: number): Measures | null {
  if (now.phase !== 'block') return null;
  const elapsed = at - now.from;
  const parts = Math.round((now.to - now.from) / MARK_MS);
  const part = Math.min(parts, Math.floor(elapsed / MARK_MS) + 1);
  const ticked = Math.floor(elapsed / TICK_MS);
  return {
    parts,
    part,
    partRemaining: now.from + part * MARK_MS - at,
    ticks: TICKS_PER_PART,
    tick: (ticked % TICKS_PER_PART) + 1,
    tickRemaining: now.from + (ticked + 1) * TICK_MS - at,
  };
}
interface TimerHooks {
  notifications: boolean;
  sound: boolean;
  schedule: ScheduleId;
}
export function useIsAnnouncer(): boolean {
  const [mine, setMine] = useState(isAnnouncer);
  useEffect(() => {
    electAnnouncer();
    setMine(isAnnouncer());
    return onAnnouncerChange(setMine);
  }, []);
  return mine;
}
export function useFocusTimer({ notifications, sound, schedule }: TimerHooks): TimerApi {
  const [now, setNow] = useState<ScheduleNow>(() => scheduleAt(Date.now(), schedule));
  const hooks = useRef({ notifications, sound, schedule });
  hooks.current = { notifications, sound, schedule };
  const said = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  useEffect(() => {
    if (notifications) void requestNotificationPermission();
  }, [notifications]);
  useEffect(() => primeAudio(), []);
  useEffect(() => {
    const sample = () => {
      const t = Date.now();
      const state = scheduleAt(t, hooks.current.schedule);
      setNow(state);
      for (const a of dueAt(state, t)) {
        if (said.current.has(a.key)) continue;
        said.current.add(a.key);
        if (a.phase && !primed.current) continue;
        if (!isFresh(a, t)) continue;
        if (hooks.current.notifications) notify(a.title);
        if (hooks.current.sound) void chime(a.kind);
      }
      primed.current = true;
    };
    sample();
    const id = setInterval(sample, 250);
    const onVisible = () => document.visibilityState === 'visible' && sample();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return { now };
}
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  if (total > 3600) {
    return `${Math.floor(total / 3600)}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
  }
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
