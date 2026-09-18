import { useEffect, useState, type FormEvent } from 'preact/compat';
import { signIn } from '../lib/auth';
import { t } from '../lib/i18n';
export function Login({
  onSignedIn,
  onCancel,
}: {
  onSignedIn: (handle: string, created: boolean) => void;
  onCancel: () => void;
}) {
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await signIn(handle, password);
    setBusy(false);
    if (result.ok) onSignedIn(result.handle, result.created);
    else setError(t(result.error));
  };
  return (
    <div className="login" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <form className="login__card" onSubmit={submit}>
        <label className="login__field">
          <span>{t('Handle')}</span>
          <input
            className="input"
            value={handle}
            onChange={(e) => setHandle(e.currentTarget.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellcheck={false}
            autoFocus
            name="username"
            autoComplete="username"
          />
        </label>

        <label className="login__field">
          <span>{t('Password')}</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            name="password"
            autoComplete="current-password"
          />
        </label>

        {error && <p className="login__error">{error}</p>}

        <button className="btn btn--primary btn--md login__go" type="submit" disabled={busy}>
          {t('Sign in')}
        </button>
      </form>
    </div>
  );
}
