import { t } from './i18n';
export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function todayKey(): string {
  return toKey(new Date());
}
export function addDays(key: string, delta: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + delta);
  return toKey(d);
}
export function diffDays(a: string, b: string): number {
  const ms = fromKey(a).getTime() - fromKey(b).getTime();
  return Math.round(ms / 86400000);
}
export function mondayWeekNumber(key: string): number {
  const monday = fromKey(key);
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);
  return Math.floor((monday.getDate() - 1) / 7) + 1;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function monthShort(monthIndex: number): string {
  return MONTHS[monthIndex];
}
function weekdayShort(dayIndex: number): string {
  return WEEKDAYS[dayIndex];
}
export function formatLong(key: string): string {
  const d = fromKey(key);
  return `${weekdayShort(d.getDay())}, ${d.getDate()} ${monthShort(d.getMonth())} ${d.getFullYear()}`;
}
export function formatShort(key: string): string {
  const d = fromKey(key);
  return `${d.getDate()} ${monthShort(d.getMonth())} ${d.getFullYear()}`;
}
export function formatRelative(key: string, today: string = todayKey()): string {
  const delta = diffDays(today, key);
  if (delta === 0) return t('Today');
  if (delta === 1) return t('Yesterday');
  if (delta === -1) return t('Tomorrow');
  if (delta > 1) return t('{days} days ago', { days: delta });
  return t('In {days} days', { days: -delta });
}
export function contributionGrid(endKey: string, weeks: number): (string | null)[][] {
  const end = fromKey(endKey);
  const lastCol = new Date(end);
  lastCol.setDate(lastCol.getDate() + (6 - lastCol.getDay()));
  const cols: (string | null)[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const col: (string | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(lastCol);
      cur.setDate(cur.getDate() - (w * 7 + (6 - d)));
      col.push(cur > end ? null : toKey(cur));
    }
    cols.push(col);
  }
  return cols;
}
