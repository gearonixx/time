import { useEffect, useState } from 'preact/compat';
import { StoreProvider } from './lib/store';
import { currentHandle } from './lib/auth';
import { load, save } from './lib/storage';
import { t } from './lib/i18n';
import { followSystemTheme } from './lib/theme';
import { Login } from './components/login';
import { Today } from './components/today';
import './styles.css';
function Header({ handle, onSignIn }: { handle: string | null; onSignIn: () => void }) {
  return (
    <header className="header">
      <div className="header__bar">
        <span className="header__spacer" />

        <div className="header__right">
          {handle ? (
            <span className="header__me">{handle}</span>
          ) : (
            <button className="header__out" onClick={onSignIn}>
              {t('Sign in')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
export default function App() {
  const [handle, setHandle] = useState<string | null>(() => currentHandle());
  const [signingIn, setSigningIn] = useState(false);
  useEffect(followSystemTheme, []);
  useEffect(() => {
    const onStorage = () => setHandle(currentHandle());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  if (signingIn) {
    return (
      <div className="app">
        <Login
          onCancel={() => setSigningIn(false)}
          onSignedIn={(next, created) => {
            if (created && !handle) save(next, load(null));
            setSigningIn(false);
            setHandle(next);
          }}
        />
      </div>
    );
  }
  return (
    <StoreProvider key={handle ?? ''} handle={handle}>
      <div className="app">
        <Header handle={handle} onSignIn={() => setSigningIn(true)} />
        <main className="shell">
          <Today />
        </main>
      </div>
    </StoreProvider>
  );
}
