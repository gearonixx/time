import { useEffect, useMemo } from 'preact/compat';
import { useStore } from '../lib/store';
import { addDays, formatRelative } from '../lib/date';
import { useFocusTimer, useIsAnnouncer } from '../lib/timer';
import { bridgeLabel, lapsedBlocks, runningSchedule, roundWindow } from '../lib/schedule';
import { blocksOf, dayHours, shapeOf, roundStart, type Day, type DayShape, type Goal } from '../lib/types';
import { SlotRow } from './slot-row';
import { InlineEdit } from './inline-edit';
import { FocusTimer } from './focus-timer';
import { ContributionGraph, hoursOf } from './contribution-graph';
import { Button, Card, Meter, num } from './ui';
import { t } from '../lib/i18n';
export const EIGHT_HOUR_DAY = 8;
function deriveLabel(task: string): string {
  const clean = task.trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  if (clean.length <= 14) return clean;
  const words = clean.split(' ');
  let out = words[0];
  for (const w of words.slice(1)) {
    if (`${out} ${w}`.length > 14) break;
    out += ` ${w}`;
  }
  return out.length > 14 ? `${out.slice(0, 13)}…` : out;
}
function roundGoalOf(day: Day, round: number, shape: DayShape): Goal | null {
  return day.goals.find((g) => g.startSlot === roundStart(shape, round)) ?? null;
}
function RoundGoal({ round, goal, onCommit }: { round: number; goal: Goal | null; onCommit: (text: string) => void }) {
  const text = goal ? goal.detail || goal.label : '';
  return (
    <div className={`round-goal round-goal--open ${text ? '' : 'round-goal--unset'}`}>
      <span className="round-goal__tag">{t('Round {round}', { round })}</span>
      <InlineEdit
        value={text}
        placeholder=""
        ariaLabel={t('Goal for round {round}', { round })}
        className="round-goal__text"
        inputClassName="round-goal__input"
        onCommit={onCommit}
      />
    </div>
  );
}
export function Today() {
  const { db, day, dispatch, activeDate, setActiveDate } = useStore();
  const schedule = runningSchedule(db.days, db.settings.schedule);
  const speaks = useIsAnnouncer();
  const timer = useFocusTimer({
    notifications: db.settings.notifications && speaks,
    sound: db.settings.sound && speaks,
    schedule,
  });
  const isToday = activeDate === timer.now.dayKey;
  const shape = shapeOf(day, schedule);
  useEffect(() => {
    const sweep = () => {
      const today = timer.now.dayKey;
      const current = db.days[today];
      for (const block of lapsedBlocks(Date.now(), schedule)) {
        if ((current?.slots[block - 1]?.status ?? 'empty') === 'empty') {
          dispatch({ type: 'setStatus', date: today, slot: block, status: 'skipped', auto: true });
        }
      }
    };
    sweep();
    const id = setInterval(sweep, 30000);
    return () => clearInterval(id);
  }, [db.days, schedule, dispatch, timer.now.dayKey]);
  const hours = dayHours(day);
  const goal = Math.min(db.settings.dailyGoal || blocksOf(shape), blocksOf(shape));
  const dayBlocks = blocksOf(shape);
  const completion = dayBlocks ? Math.round((hours / dayBlocks) * 100) : 0;
  const record = useMemo(() => {
    let best: {
      date: string;
      hours: number;
    } | null = null;
    for (const [date, d] of Object.entries(db.days)) {
      if (date === activeDate) continue;
      const h = dayHours(d);
      if (h > 0 && (!best || h > best.hours)) best = { date, hours: h };
    }
    return best;
  }, [db.days, activeDate]);
  const todayStatuses = (db.days[timer.now.dayKey] ?? day).slots.map((s) => s.status);
  const setRoundGoal = (round: number, text: string) => {
    const existing = roundGoalOf(day, round, shape);
    if (!text) {
      if (existing) dispatch({ type: 'removeGoal', date: activeDate, id: existing.id });
      return;
    }
    dispatch({
      type: 'addGoal',
      date: activeDate,
      startSlot: roundStart(shape, round),
      label: deriveLabel(text),
      detail: text,
    });
  };
  const renderBlock = (from: number, to: number) => {
    const rows = [];
    for (let i = from; i <= to; i++) {
      const slot = day.slots[i - 1] ?? { index: i, status: 'empty' as const, note: '' };
      rows.push(
        <SlotRow
          key={i}
          slot={slot}
          active={isToday && timer.now.phase === 'block' && timer.now.block === i}
          onCycle={() => dispatch({ type: 'cycleStatus', date: activeDate, slot: i })}
          onStatus={(status) => dispatch({ type: 'setStatus', date: activeDate, slot: i, status })}
          onNote={(note) => dispatch({ type: 'setNote', date: activeDate, slot: i, note })}
        />,
      );
    }
    return rows;
  };
  return (
    <div className="today-page">
      <div className="today">
        <div className="today__main">
          <Card className="day-card" padded={false}>
            <div className="day-progress">
              <div className="day-head">
                <button
                  className="icon-btn icon-btn--sm"
                  onClick={() => setActiveDate(addDays(activeDate, -1))}
                  aria-label={t('Previous day')}
                >
                  ‹
                </button>

                <h2>{formatRelative(activeDate, timer.now.dayKey)}</h2>
                <button
                  className="icon-btn icon-btn--sm"
                  onClick={() => setActiveDate(addDays(activeDate, 1))}
                  aria-label={t('Next day')}
                >
                  ›
                </button>
                {!isToday && (
                  <Button size="sm" onClick={() => setActiveDate(timer.now.dayKey)}>
                    {t('Today')}
                  </Button>
                )}
              </div>
              <span className="day-progress__hours">
                <strong>{num(hours)}</strong>
                <span className="muted">
                  / {goal} {t('h')}
                </span>
              </span>
              <Meter value={hours / goal} tone="success" label={t('Hours today')} />

              <span
                className={`day-progress__pct ${completion >= 100 ? 'day-progress__pct--full' : ''}`}
                title={t('{hours} of {blocks} blocks completed', {
                  hours: num(hours),
                  blocks: dayBlocks,
                })}
              >
                {completion}%
              </span>
            </div>

            {record && (
              <div className={`record ${hours > record.hours ? 'record--broken' : ''}`}>
                <span className="record__tag">{t('RECORD')}</span>
                <strong>{t('{hours} h', { hours: num(record.hours) })}</strong>
                <span className="muted">{formatRelative(record.date, timer.now.dayKey)}</span>
                <span className="record__gap">
                  {hours > record.hours
                    ? t('BEATEN — this is the new one.')
                    : t('{hours} h to beat it.', { hours: num(record.hours - hours + 0.5) })}
                </span>
              </div>
            )}

            <div className="day-scroll">
              {shape.rounds.map((count, i) => {
                const round = i + 1;
                const first = roundStart(shape, round);
                const editableWindow = round <= 2;
                return (
                  <div key={round}>
                    {round > 1 && (
                      <div className="bridge">
                        <span className="bridge__line" />
                        <span className="bridge__label">{bridgeLabel(round - 1)}</span>
                        <span className="bridge__line" />
                      </div>
                    )}

                    <RoundGoal
                      round={round}
                      goal={roundGoalOf(day, round, shape)}
                      onCommit={(text) => setRoundGoal(round, text)}
                    />

                    <div className="window-row">
                      {editableWindow ? (
                        <InlineEdit
                          value={round === 1 ? day.windowTop : day.windowBottom}
                          placeholder={roundWindow(round, Date.now(), shape.id)}
                          ariaLabel={t('Round {round} window', { round })}
                          className="window"
                          inputClassName="window-input"
                          onCommit={(value) =>
                            dispatch({
                              type: 'setWindow',
                              date: activeDate,
                              which: round === 1 ? 'top' : 'bottom',
                              value,
                            })
                          }
                        />
                      ) : (
                        <span className="window">{roundWindow(round, Date.now(), shape.id)}</span>
                      )}
                    </div>

                    <div className="slots">{renderBlock(first, first + count - 1)}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <aside className="today__side">
          <Card>
            <FocusTimer timer={timer} statuses={todayStatuses} />
          </Card>
        </aside>
      </div>

      <Card padded={false}>
        <ContributionGraph hours={hoursOf(db)} floor={EIGHT_HOUR_DAY} onPick={setActiveDate} />
      </Card>
    </div>
  );
}
