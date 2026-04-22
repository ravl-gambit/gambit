import { useState, useEffect } from 'react';
import { initiateLogin, getUser, saveUser, clearUser } from './auth.js';

// ── Landing ────────────────────────────────────────────────────────────────

function Landing() {
  return (
    <div className="page">
      <div className="board-texture" aria-hidden="true" />

      <header className="header">
        <div className="logo">
          <span className="logo-icon">♞</span>
          <span className="logo-text">GAMBIT</span>
        </div>
      </header>

      <section className="hero">
        <div className="hero-watermark" aria-hidden="true">♚</div>
        <div className="hero-content">
          <h1 className="hero-headline">Your private chess ladder</h1>
          <p className="hero-body">
            Run a ranked ladder for your team or friend group.
            <br />
            Challenge up, track every game, and climb to the top.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={initiateLogin}>
              Create a group
            </button>
            <button className="btn btn-ghost" onClick={initiateLogin}>
              Join a group
            </button>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-grid">
          <article className="feature-card">
            <span className="feature-icon">♜</span>
            <h3 className="feature-title">Private groups</h3>
            <p className="feature-body">
              Invite-only ladders for your crew. No public matchmaking,
              no strangers — just your people.
            </p>
          </article>
          <article className="feature-card">
            <span className="feature-icon">♞</span>
            <h3 className="feature-title">Lichess powered</h3>
            <p className="feature-body">
              Play real games on Lichess. Results sync automatically —
              no manual logging required.
            </p>
          </article>
          <article className="feature-card">
            <span className="feature-icon">♟</span>
            <h3 className="feature-title">Mobile friendly</h3>
            <p className="feature-body">
              Check standings, issue challenges, and track results from
              anywhere on your phone.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}

// ── Auth callback ──────────────────────────────────────────────────────────

function AuthCallback({ onSuccess }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const oauthError = params.get('error');
    const verifier = sessionStorage.getItem('pkce_verifier');

    if (oauthError) {
      setError('Lichess login was cancelled or denied.');
      return;
    }

    if (!code || !verifier) {
      setError('Invalid login state. Please try again.');
      return;
    }

    fetch('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        code_verifier: verifier,
        redirect_uri: `${window.location.origin}/auth/callback`,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        sessionStorage.removeItem('pkce_verifier');
        saveUser(data.user);
        window.history.replaceState({}, '', '/');
        onSuccess(data.user);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="page">
        <div className="board-texture" aria-hidden="true" />
        <div className="auth-status">
          <span className="auth-status-icon">♟</span>
          <p className="auth-status-text auth-error">{error}</p>
          <button className="btn btn-ghost" onClick={() => window.location.replace('/')}>
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="board-texture" aria-hidden="true" />
      <div className="auth-status">
        <span className="auth-status-icon spin">♞</span>
        <p className="auth-status-text">Connecting your Lichess account…</p>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────

function Dashboard({ user, onSignOut }) {
  const initials = (user.display_name || user.lichess_id)[0].toUpperCase();

  function handleSignOut() {
    clearUser();
    onSignOut();
  }

  return (
    <div className="page">
      <div className="board-texture" aria-hidden="true" />

      <header className="header">
        <div className="logo">
          <span className="logo-icon">♞</span>
          <span className="logo-text">GAMBIT</span>
        </div>
        <button className="sign-out-btn" onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-card">
          <div className="avatar">{initials}</div>
          <p className="welcome-label">Welcome back</p>
          <h1 className="welcome-name">{user.display_name || user.lichess_id}</h1>
          <p className="welcome-sub">
            Connected as{' '}
            <a
              className="lichess-link"
              href={`https://lichess.org/@/${user.lichess_id}`}
              target="_blank"
              rel="noreferrer"
            >
              @{user.lichess_id}
            </a>{' '}
            on Lichess
          </p>

          <div className="dashboard-actions">
            <button className="btn btn-primary btn-wide">Create a group</button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Router ─────────────────────────────────────────────────────────────────

export default function App() {
  const isCallback = window.location.pathname === '/auth/callback';
  const [user, setUser] = useState(() => (isCallback ? null : getUser()));
  const [page, setPage] = useState(() => {
    if (isCallback) return 'callback';
    if (getUser()) return 'dashboard';
    return 'landing';
  });

  function handleAuthSuccess(u) {
    setUser(u);
    setPage('dashboard');
  }

  function handleSignOut() {
    setUser(null);
    setPage('landing');
  }

  if (page === 'callback') return <AuthCallback onSuccess={handleAuthSuccess} />;
  if (page === 'dashboard' && user) return <Dashboard user={user} onSignOut={handleSignOut} />;
  return <Landing />;
}
