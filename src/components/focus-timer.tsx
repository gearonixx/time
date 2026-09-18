import { formatClock, measuresAt, type TimerApi } from '../lib/timer';
import { atClock, blockWindow, bridgeIndex, bridgeLabel, roundWindow } from '../lib/schedule';
import { placeOf, type SlotStatus } from '../lib/types';
import { t } from '../lib/i18n';
const RADIUS = 62;
const CIRCUM = 2 * Math.PI * RADIUS;
const PIP_LABEL: Record<SlotStatus, string> = {
  empty: 'unclaimed',
  done: 'clean',
  partial: 'dirty',
  skipped: 'skipped',
};
function Measure({ tag, of, at, remaining }: { tag: string; of: number; at: number; remaining: number }) {
  return (
    <div
      className="measure"
      aria-label={t('{tag} {at} of {of}, {clock} remaining', {
        tag,
        at,
        of,
        clock: formatClock(remaining),
      })}
    >
      <span className="measure__tag">{tag}</span>
      <span className="measure__bar">
        {Array.from({ length: of }, (_, i) => (
          <span key={i} className={`mpip ${i < at - 1 ? 'mpip--spent' : i === at - 1 ? 'mpip--now' : ''}`} />
        ))}
      </span>
      <span className="measure__left">{formatClock(remaining)}</span>
    </div>
  );
}
export function FocusTimer({ timer, statuses }: { timer: TimerApi; statuses: SlotStatus[] }) {
  const { now } = timer;
  const phase = now.phase;
  const running = phase === 'block';
  const place = now.block ? placeOf(now.rounds, now.block) : null;
  const label =
    phase === 'before'
      ? t('Opens {clock}', { clock: atClock(now.dayStart) })
      : phase === 'after'
        ? t('Day complete')
        : phase === 'bridge'
          ? bridgeLabel(bridgeIndex(now))
          : phase === 'intensive'
            ? t('INTENSIVE WORK')
            : phase === 'break'
              ? t('Break')
              : place
                ? t('Round {round} · Block {index} of {of}', {
                    round: place.round,
                    index: place.index,
                    of: place.of,
                  })
                : t('Block {block} of {blocks}', { block: now.block ?? 0, blocks: now.blocks });
  const sub =
    phase === 'before'
      ? t('Block 1 at {clock}', { clock: atClock(now.dayStart) })
      : phase === 'after'
        ? t('Closed at {clock}', { clock: atClock(now.dayEnd) })
        : phase === 'block' && now.block
          ? `${atClock(blockWindow(now.block, Date.now(), now.schedule).from)} – ${atClock(now.to)} · ${now.block}/${now.blocks}`
          : t('Block {block} at {clock}', {
              block: now.nextBlock ?? 0,
              clock: atClock(now.to),
            });
  const clock = phase === 'after' ? '00:00' : formatClock(now.remaining);
  const measures = measuresAt(now, Date.now());
  return (
    <div className={`timer timer--${phase}`}>
      <div className="timer__ring">
        <svg viewBox="0 0 140 140" role="img" aria-label={t('{label}, {clock} remaining', { label, clock })}>
          <circle className="timer__track" cx="70" cy="70" r={RADIUS} />
          <circle
            className="timer__progress"
            cx="70"
            cy="70"
            r={RADIUS}
            strokeDasharray={CIRCUM}
            strokeDashoffset={CIRCUM * (1 - (phase === 'before' ? 0 : now.progress))}
          />
        </svg>
        <div className="timer__face">
          <span className="timer__clock">{clock}</span>
          <span className="timer__phase">{label}</span>

          {now.block && (
            <span className="timer__count">
              {t('Block {block}/{blocks}', { block: now.block, blocks: now.blocks })}
            </span>
          )}
          <span className="timer__window">{sub}</span>
        </div>
      </div>

      <div className="timer__meta">
        <div
          className="timer__pips"
          aria-label={t('{elapsed} of {blocks} blocks elapsed', {
            elapsed: now.elapsedBlocks,
            blocks: now.blocks,
          })}
        >
          {Array.from({ length: now.blocks }, (_, i) => {
            const status = statuses[i] ?? 'empty';
            return (
              <span
                key={i}
                title={t('Round {round}, block {index} of {of} ({block}/{blocks}) — {status}', {
                  round: placeOf(now.rounds, i + 1).round,
                  index: placeOf(now.rounds, i + 1).index,
                  of: placeOf(now.rounds, i + 1).of,
                  block: i + 1,
                  blocks: now.blocks,
                  status: t(PIP_LABEL[status]),
                })}
                className={`pip pip--${status} ${i + 1 === now.block && running ? 'pip--now' : ''} ${now.boundaries.includes(i + 1) ? 'pip--bridge' : ''}`}
              />
            );
          })}
        </div>

        {measures && (
          <div className="measures">
            <Measure tag={t('PART')} of={measures.parts} at={measures.part} remaining={measures.partRemaining} />
            <Measure tag={t('TICK')} of={measures.ticks} at={measures.tick} remaining={measures.tickRemaining} />
          </div>
        )}

        <div className="timer__plan">
          {now.rounds.map((_, i) => (
            <span key={i}>
              <strong>{t('Round {round}', { round: i + 1 })}</strong> {roundWindow(i + 1, now.dayStart, now.schedule)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
