import { blocksOf, boundariesOf, LAPSE_MS, SCHEDULES, roundStart, type DayShape, type ScheduleId } from './types';
import { t } from './i18n';
export const BLOCK_MS = 60 * 60 * 1000;
export const BREAK_MS = 10 * 60 * 1000;
export const BRIDGE_MS = 30 * 60 * 1000;
export const DAY_START_HOUR = 10;
export const DAY_START_MINUTE = 0;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const CLOSING_GRACE_MS = 30 * 60 * 1000;
export type SegmentKind = 'block' | 'break' | 'bridge' | 'intensive';
export interface Segment {
  kind: SegmentKind;
  block: number;
  from: number;
  to: number;
}
function build(shape: DayShape): Segment[] {
  const out: Segment[] = [];
  let t = 0;
  let block = 0;
  shape.rounds.forEach((count, round) => {
    for (let i = 0; i < count; i++) {
      block++;
      out.push({ kind: 'block', block, from: t, to: t + BLOCK_MS });
      t += BLOCK_MS;
      if (i < count - 1) {
        const kind = shape.intensive.includes(round + 1) ? 'intensive' : 'break';
        out.push({ kind, block, from: t, to: t + BREAK_MS });
        t += BREAK_MS;
      }
    }
    const bridge = (shape.bridges[round] ?? 0) * 60 * 1000;
    if (round < shape.rounds.length - 1 && bridge > 0) {
      out.push({ kind: 'bridge', block, from: t, to: t + bridge });
      t += bridge;
    }
  });
  return out;
}
const TIMELINES: Record<ScheduleId, Segment[]> = {
  standard: build(SCHEDULES.standard),
  experimental: build(SCHEDULES.experimental),
};
export function timelineOf(id: ScheduleId): Segment[] {
  return TIMELINES[id] ?? TIMELINES.standard;
}
export const TIMELINE = TIMELINES.standard;
export function dayLengthOf(id: ScheduleId): number {
  const line = timelineOf(id);
  return line[line.length - 1].to;
}
export const DAY_LENGTH_MS = dayLengthOf('standard');
function clockStart(now: number): number {
  const d = new Date(now);
  d.setHours(DAY_START_HOUR, DAY_START_MINUTE, 0, 0);
  return d.getTime();
}
export function dayStartFor(now: number, id: ScheduleId = 'standard'): number {
  const today = clockStart(now);
  if (now >= today) return today;
  const yesterday = today - DAY_MS;
  return now < yesterday + dayLengthOf(id) + CLOSING_GRACE_MS ? yesterday : today;
}
export function runningDayKey(now: number = Date.now(), id: ScheduleId = 'standard'): string {
  const d = new Date(dayStartFor(now, id));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function runningSchedule(
  days: Record<
    string,
    | {
        schedule?: ScheduleId;
      }
    | undefined
  >,
  preferred: ScheduleId,
  now: number = Date.now(),
): ScheduleId {
  for (const id of ['experimental', 'standard'] as const) {
    const stamped = days[runningDayKey(now, id)]?.schedule;
    if (stamped) return stamped;
  }
  return preferred;
}
export function blockWindow(
  block: number,
  now: number,
  id: ScheduleId = 'standard',
): {
  from: number;
  to: number;
} {
  const base = dayStartFor(now, id);
  const seg = timelineOf(id).find((s) => s.kind === 'block' && s.block === block);
  if (!seg) return { from: base, to: base };
  return { from: base + seg.from, to: base + seg.to };
}
export type SchedulePhase = 'before' | 'block' | 'break' | 'bridge' | 'intensive' | 'after';
export interface ScheduleNow {
  phase: SchedulePhase;
  block: number | null;
  nextBlock: number | null;
  from: number;
  to: number;
  remaining: number;
  progress: number;
  elapsedBlocks: number;
  dayStart: number;
  dayEnd: number;
  key: string;
  schedule: ScheduleId;
  blocks: number;
  rounds: number[];
  boundaries: number[];
  dayKey: string;
}
export function scheduleAt(now: number, id: ScheduleId = 'standard'): ScheduleNow {
  const shape = SCHEDULES[id] ?? SCHEDULES.standard;
  const line = timelineOf(id);
  const dayStart = dayStartFor(now, id);
  const dayEnd = dayStart + dayLengthOf(id);
  const offset = now - dayStart;
  const elapsedBlocks = line.filter((s) => s.kind === 'block' && offset >= s.to).length;
  const base = {
    elapsedBlocks,
    dayStart,
    dayEnd,
    schedule: shape.id,
    blocks: blocksOf(shape),
    rounds: shape.rounds,
    boundaries: boundariesOf(shape),
    dayKey: runningDayKey(now, id),
  };
  if (offset < 0) {
    const from = dayStart - DAY_MS;
    return {
      ...base,
      phase: 'before',
      block: null,
      nextBlock: 1,
      from,
      to: dayStart,
      remaining: dayStart - now,
      progress: 0,
      key: 'before',
    };
  }
  const seg = line.find((s) => offset < s.to);
  if (!seg) {
    return {
      ...base,
      phase: 'after',
      block: blocksOf(shape),
      nextBlock: null,
      from: dayEnd,
      to: dayEnd,
      remaining: 0,
      progress: 1,
      key: 'after',
    };
  }
  const from = dayStart + seg.from;
  const to = dayStart + seg.to;
  const length = seg.to - seg.from;
  return {
    ...base,
    phase: seg.kind,
    block: seg.block,
    nextBlock: seg.kind === 'block' ? seg.block : seg.block + 1,
    from,
    to,
    remaining: to - now,
    progress: length ? (now - from) / length : 0,
    key: `${seg.kind}:${seg.block}`,
  };
}
export function bridgeIndex(now: ScheduleNow): number {
  if (now.phase !== 'bridge' || now.block === null) return 0;
  return now.boundaries.indexOf(now.block) + 1;
}
export function bridgeLabel(index: number): string {
  return index > 1 ? t('BRIDGE #{index}', { index }) : t('BRIDGE');
}
export function lapsedBlocks(now: number, id: ScheduleId = 'standard'): number[] {
  const base = dayStartFor(now, id);
  return timelineOf(id)
    .filter((s) => s.kind === 'block' && now - (base + s.to) >= LAPSE_MS)
    .map((s) => s.block);
}
export function atClock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export function roundWindow(round: number, now: number, id: ScheduleId = 'standard'): string {
  const shape = SCHEDULES[id] ?? SCHEDULES.standard;
  const first = roundStart(shape, round);
  const last = first + (shape.rounds[round - 1] ?? 0) - 1;
  return `${atClock(blockWindow(first, now, id).from)} – ${atClock(blockWindow(last, now, id).to)}`;
}
