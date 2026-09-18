import { useEffect, useRef, useState } from 'preact/compat';
import { t } from '../lib/i18n';
export function InlineEdit({
  value,
  placeholder,
  onCommit,
  className = '',
  inputClassName = '',
  ariaLabel,
  multilineHint,
  display,
  autoEdit = false,
}: {
  value: string;
  placeholder: string;
  onCommit: (next: string) => void;
  className?: string;
  inputClassName?: string;
  ariaLabel: string;
  multilineHint?: boolean;
  display?: (value: string) => React.ReactNode;
  autoEdit?: boolean;
}) {
  const [editing, setEditing] = useState(autoEdit);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);
  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    el?.focus();
    el?.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);
  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== value) onCommit(next);
  };
  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`inline-edit__input ${inputClassName}`}
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }
  return (
    <button
      type="button"
      className={`inline-edit ${value ? '' : 'inline-edit--empty'} ${className}`}
      onClick={() => setEditing(true)}
      aria-label={t('{label}{value} — click to edit', {
        label: ariaLabel,
        value: value ? `: ${value}` : t(' (empty)'),
      })}
      title={multilineHint ? value : undefined}
    >
      {value ? display ? display(value) : value : <span className="inline-edit__ph">{placeholder}</span>}
    </button>
  );
}
