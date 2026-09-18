import { useEffect, useMemo, useRef, useState } from 'preact/compat';
import { contributionGrid, formatShort, fromKey, monthShort, todayKey } from '../lib/date';
import { intensity, intensityFrom } from '../lib/stats';
import { dayHours, MAX_BLOCKS, type Database } from '../lib/types';
import { num } from './ui';
import { t } from '../lib/i18n';
const WEEKS = 53;
type HoursByDate = Record<string, number>;
export function hoursOf(db: Database): HoursByDate {
  const out: HoursByDate = {};
  for (const [date, day] of Object.entries(db.days)) out[date] = dayHours(day);
  return out;
}
export function ContributionGraph({
  hours: hoursByDate,
  onPick,
  floor = 0,
}: {
  hours: HoursByDate;
  onPick?: (date: string) => void;
  floor?: number;
}) {
  const [hover, setHover] = useState<{
    date: string;
    hours: number;
    x: number;
    y: number;
  } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const today = todayKey();
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);
  const cols = useMemo(() => contributionGrid(today, WEEKS), [today]);
  const monthLabels = useMemo(() => {
    const out: {
      col: number;
      label: string;
    }[] = [];
    let last = -1;
    cols.forEach((col, i) => {
      const first = col.find(Boolean);
      if (!first) return;
      const m = fromKey(first).getMonth();
      if (m !== last) {
        if (out.length === 0 || i - out[out.length - 1].col >= 3) {
          out.push({ col: i, label: monthShort(m) });
        }
        last = m;
      }
    });
    return out;
  }, [cols]);
  const totalHours = useMemo(() => Object.values(hoursByDate).reduce((sum, h) => sum + h, 0), [hoursByDate]);
  const qualifying = useMemo(
    () => Object.values(hoursByDate).filter((h) => h >= floor && h > 0).length,
    [hoursByDate, floor],
  );
  const level = (hours: number) => (floor > 0 ? intensityFrom(hours, floor, MAX_BLOCKS) : intensity(hours));
  return (
    <div className="graph">
      <div className="graph__scroll" ref={scroller}>
        <div className="graph__inner">
          <div className="graph__months">
            {monthLabels.map((m) => (
              <span key={`${m.col}-${m.label}`} style={{ gridColumnStart: m.col + 1 }}>
                {m.label}
              </span>
            ))}
          </div>

          <div className="graph__body">
            <div className="graph__days">
              <span>{t('Mon')}</span>
              <span>{t('Wed')}</span>
              <span>{t('Fri')}</span>
            </div>

            <div
              className="graph__grid"
              role="grid"
              aria-label={floor > 0 ? t('Days of at least {floor} hours', { floor }) : t('Hours studied per day')}
            >
              {cols.map((col, ci) => (
                <div className="graph__col" key={ci} role="row">
                  {col.map((date, ri) => {
                    if (!date) return <span className="cell cell--void" key={ri} aria-hidden />;
                    const hours = hoursByDate[date] ?? 0;
                    return (
                      <button
                        key={date}
                        role="gridcell"
                        className={`cell cell--l${level(hours)} ${date === today ? 'cell--today' : ''}`}
                        aria-label={t('{date}: {hours} hours', {
                          date: formatShort(date),
                          hours: num(hours),
                        })}
                        onClick={() => onPick?.(date)}
                        onMouseEnter={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          setHover({ date, hours, x: r.left + r.width / 2, y: r.top });
                        }}
                        onMouseLeave={() => setHover(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="graph__legend">
        <span className="muted">
          {floor > 0
            ? t('{days} days over {floor} h in the last year', {
                days: qualifying,
                floor: num(floor),
              })
            : t('{hours} hours in the last year', { hours: num(totalHours) })}
        </span>
        <div className="graph__scale">
          <span className="muted">{t('Less')}</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`cell cell--l${l}`} aria-hidden />
          ))}
          <span className="muted">{t('More')}</span>
        </div>
      </div>

      {hover && (
        <div className="graph__tip" style={{ left: hover.x, top: hover.y }}>
          <strong>{t('{hours} h', { hours: num(hover.hours) })}</strong>
          {t(' on {date}', { date: formatShort(hover.date) })}
          {floor > 0 && hover.hours < floor && <span className="muted">{t(' — under the bar')}</span>}
        </div>
      )}
    </div>
  );
}
