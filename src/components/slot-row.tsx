import { type Slot, type SlotStatus } from '../lib/types';
import { t } from '../lib/i18n';
import { InlineEdit } from './inline-edit';
const ORDER: SlotStatus[] = ['empty', 'done', 'partial', 'skipped'];
const STATUS_LABEL: Record<SlotStatus, string> = {
  empty: 'Unclaimed',
  done: 'Clean',
  partial: 'Dirty',
  skipped: 'Skipped',
};
const STATUS_MARK: Record<SlotStatus, string> = {
  empty: '',
  done: '✓',
  partial: '◐',
  skipped: '✕',
};
export function SlotRow({
  slot,
  active,
  onCycle,
  onStatus,
  onNote,
}: {
  slot: Slot;
  active: boolean;
  onCycle: () => void;
  onStatus: (status: SlotStatus) => void;
  onNote: (note: string) => void;
}) {
  return (
    <div className={`slot slot--${slot.status} ${active ? 'slot--active' : ''}`}>
      <span className="slot__index" aria-hidden>
        {slot.index}
      </span>

      <button
        className="slot__box"
        onClick={onCycle}
        onContextMenu={(e) => {
          e.preventDefault();
          onStatus(ORDER[(ORDER.indexOf(slot.status) + ORDER.length - 1) % ORDER.length]);
        }}
        aria-label={t('Block {index}: {status}', {
          index: slot.index,
          status: t(STATUS_LABEL[slot.status]),
        })}
        title={t(STATUS_LABEL[slot.status])}
      >
        {STATUS_MARK[slot.status]}
      </button>

      <div className="slot__text">
        <InlineEdit
          value={slot.note}
          placeholder={active ? t('running…') : ''}
          onCommit={onNote}
          ariaLabel={t('Comment on block {index}', { index: slot.index })}
          className="slot__note"
          inputClassName="slot__note-input"
        />
      </div>
    </div>
  );
}
