import { useState, useEffect } from 'react';
import { initiateLogin, getUser, saveUser, clearUser } from './auth.js';

// ── Shared header ──────────────────────────────────────────────────────────

function Header({ onLogoClick, right }) {
  const logo = (
    <div className="logo">
      <span className="logo-icon">♞</span>
      <span className="logo-text">GAMBIT</span>
    </div>
  );
  return (
    <header className="header">
      {onLogoClick ? (
        <button className="logo-btn" onClick={onLogoClick}>{logo}</button>
      ) : logo}
      {right}
    </header>
  );
}

// ── Landing ────────────────────────────────────────────────────────────────

function Landing() {
  return (
    <div className="page">
      <div className="board-texture" aria-hidden="true" />
      <Header />

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

function Dashboard({ user, onSignOut, onCreateGroup }) {
  const initials = (user.display_name || user.lichess_id)[0].toUpperCase();

  return (
    <div className="page">
      <div className="board-texture" aria-hidden="true" />
      <Header
        right={
          <button className="sign-out-btn" onClick={() => { clearUser(); onSignOut(); }}>
            Sign out
          </button>
        }
      />
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
            <button className="btn btn-primary btn-wide" onClick={onCreateGroup}>
              Create a group
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Create group ───────────────────────────────────────────────────────────

function CreateGroup({ user, onCreated, onBack }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), user_id: user.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onCreated(data.group);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="board-texture" aria-hidden="true" />
      <Header onLogoClick={onBack} />
      <main className="form-main">
        <div className="form-card">
          <h1 className="form-title">Name your ladder</h1>
          <p className="form-subtitle">
            Give your group a name. You'll get a shareable invite link once it's created.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="group-name">Group name</label>
              <input
                id="group-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Work Chess Club"
                maxLength={60}
                autoFocus
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!name.trim() || loading}
              >
                {loading ? 'Creating…' : 'Create group'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onBack}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

// ── Group page ─────────────────────────────────────────────────────────────

function GroupPage({ group: initialGroup, user, onBack }) {
  const [members, setMembers] = useState([]);
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${window.location.origin}/join/${initialGroup.invite_code}`;

  useEffect(() => {
    fetch(`/api/groups/${initialGroup.id}`)
      .then((r) => r.json())
      .then((data) => setMembers(data.members ?? []));
  }, [initialGroup.id]);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — user can copy manually
    }
  }

  return (
    <div className="page">
      <div className="board-texture" aria-hidden="true" />
      <Header
        onLogoClick={onBack}
        right={
          <button className="sign-out-btn" onClick={onBack}>
            ← My groups
          </button>
        }
      />

      <main className="group-main">
        <h1 className="group-name">{initialGroup.name}</h1>
        <p className="group-meta">Season {initialGroup.season}</p>

        <div className="panel">
          <p className="panel-label">Invite link</p>
          <div className="invite-row">
            <span className="invite-url">{inviteUrl}</span>
            <button
              className={`copy-btn${copied ? ' copied' : ''}`}
              onClick={copyInvite}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="panel">
          <p className="panel-label">Standings</p>
          {members.length === 0 ? (
            <div className="empty-ladder">
              <span className="empty-ladder-icon">♟</span>
              <p className="empty-ladder-text">
                No members yet — share your invite link to get started.
              </p>
            </div>
          ) : (
            <table className="standings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th className="col-right">Rating</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={m.lichess_id}>
                    <td className="col-rank">{m.rank ?? i + 1}</td>
                    <td>
                      <a
                        href={`https://lichess.org/@/${m.lichess_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="player-link"
                      >
                        {m.display_name}
                      </a>
                    </td>
                    <td className="col-right col-rating">{m.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
  const [group, setGroup] = useState(null);

  function handleAuthSuccess(u) {
    setUser(u);
    setPage('dashboard');
  }

  function handleGroupCreated(g) {
    setGroup(g);
    setPage('group');
  }

  if (page === 'callback')
    return <AuthCallback onSuccess={handleAuthSuccess} />;

  if (page === 'dashboard' && user)
    return (
      <Dashboard
        user={user}
        onSignOut={() => { setUser(null); setPage('landing'); }}
        onCreateGroup={() => setPage('create-group')}
      />
    );

  if (page === 'create-group' && user)
    return (
      <CreateGroup
        user={user}
        onCreated={handleGroupCreated}
        onBack={() => setPage('dashboard')}
      />
    );

  if (page === 'group' && group)
    return (
      <GroupPage
        group={group}
        user={user}
        onBack={() => setPage('dashboard')}
      />
    );

  return <Landing />;
}
