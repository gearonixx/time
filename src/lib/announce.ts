import { bridgeIndex, bridgeLabel, type ScheduleNow } from './schedule';
import { t as say } from './i18n';
const ANNOUNCE_WINDOW_MS = 90 * 1000;
export const MARK_MS = 10 * 60 * 1000;
export const TICKS_PER_PART = 3;
export const TICK_MS = MARK_MS / TICKS_PER_PART;
export type ChimeKind = 'focus' | 'break' | 'done' | 'mark';
interface Announcement {
  key: string;
  title: string;
  kind: ChimeKind;
  at: number;
  phase: boolean;
}
function stretch(next: ScheduleNow): [string, ChimeKind] | null {
  const minutes = Math.round((next.to - next.from) / 60000);
  switch (next.phase) {
    case 'block':
      return [say('Block {block}/{blocks}', { block: next.block ?? 0, blocks: next.blocks }), 'focus'];
    case 'break':
      return [say('Break · {minutes} min', { minutes }), 'break'];
    case 'intensive':
      return [say('Intensive · {minutes} min', { minutes }), 'focus'];
    case 'bridge':
      return [`${bridgeLabel(bridgeIndex(next))} · ${say('{minutes} min', { minutes })}`, 'break'];
    case 'after':
      return [say('Day complete'), 'done'];
    default:
      return null;
  }
}
export function dueAt(state: ScheduleNow, t: number): Announcement[] {
  const out: Announcement[] = [];
  const said = stretch(state);
  if (said) {
    const [title, kind] = said;
    out.push({
      key: `phase:${state.key}`,
      title,
      kind,
      at: state.phase === 'after' ? state.dayEnd : state.from,
      phase: true,
    });
  }
  if (state.phase === 'block') {
    const mark = Math.floor((t - state.from) / MARK_MS);
    if (mark >= 1) {
      const at = state.from + mark * MARK_MS;
      const left = Math.floor((state.to - at) / 60000);
      out.push({
        key: `${state.key}#mark${mark}`,
        title: say('{left} minutes left', { left }),
        kind: 'mark',
        at,
        phase: false,
      });
    }
  }
  return out;
}
export function isFresh(a: Announcement, t: number): boolean {
  return t - a.at < ANNOUNCE_WINDOW_MS;
}
