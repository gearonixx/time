import { type ButtonHTMLAttributes, type ReactNode } from 'preact/compat';
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
};
export function Button({ variant = 'default', size = 'md', className = '', ...rest }: ButtonProps) {
  return <button className={`btn btn--${variant} btn--${size} ${className}`} {...rest} />;
}
export function Card({
  title,
  action,
  children,
  className = '',
  padded = true,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card__head">
          {typeof title === 'string' ? <h2>{title}</h2> : title}
          {action}
        </header>
      )}
      <div className={padded ? 'card__body' : 'card__body--flush'}>{children}</div>
    </section>
  );
}
export function Meter({
  value,
  tone = 'accent',
  label,
}: {
  value: number;
  tone?: 'accent' | 'success';
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className="meter"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`meter__fill meter__fill--${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
export function num(value: number, digits = 1): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}
