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
        const pendingInvite = sessionStorage.getItem('pending_invite');
        sessionStorage.removeItem('pkce_verifier');
        if (pendingInvite) sessionStorage.removeItem('pending_invite');
        saveUser(data.user);
        window.history.replaceState({}, '', '/');
        onSuccess(data.user, pendingInvite);
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

// ── Join page ──────────────────────────────────────────────────────────────

function JoinPage({ inviteCode, user, onJoined, onBack }) {
  const [group, setGroup] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/groups/invite/${inviteCode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setGroup(data.group);
        setMemberCount(data.member_count);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [inviteCode]);

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${inviteCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onJoined(data.group);
    } catch (err) {
      setError(err.message);
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="board-texture" aria-hidden="true" />
        <div className="auth-status">
          <span className="auth-status-icon spin">♞</span>
          <p className="auth-status-text">Loading group…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="board-texture" aria-hidden="true" />
      <Header onLogoClick={onBack} />
      <main className="form-main">
        <div className="form-card">
          <span className="join-icon">♛</span>
          <h1 className="form-title">{error ? 'Invalid invite' : group?.name}</h1>
          {error ? (
            <>
              <p className="form-error">{error}</p>
              <button className="btn btn-ghost btn-wide" onClick={onBack}>Back</button>
            </>
          ) : (
            <>
              <p className="form-subtitle">
                {memberCount === 0
                  ? 'Be the first to join this ladder.'
                  : `${memberCount} member${memberCount === 1 ? '' : 's'} on the ladder`}
              </p>
              <button
                className="btn btn-primary btn-wide"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? 'Joining…' : 'Join Ladder'}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Group page ─────────────────────────────────────────────────────────────

function GroupPage({ group: initialGroup, user, onBack, onRecordResult }) {
  const [members, setMembers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [challengeResult, setChallengeResult] = useState(null);
  const [challengeError, setChallengeError] = useState(null);
  const [challenging, setChallenging] = useState(null);
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

  const me = members.find((m) => m.lichess_id === user?.lichess_id);
  const challengeable = me
    ? members.filter((m) => me.rank - m.rank >= 1 && me.rank - m.rank <= 3)
    : [];

  async function handleChallenge(defender) {
    setChallenging(defender.lichess_id);
    setChallengeError(null);
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: initialGroup.id,
          challenger_id: user.id,
          defender_id: defender.user_id,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChallengeResult({ url: data.challenge_url, defenderName: defender.display_name });
    } catch (err) {
      setChallengeError(err.message);
    } finally {
      setChallenging(null);
    }
  }

  const showChallengeCol = me && challengeable.length > 0;

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
                  <th className="col-right">Gambit</th>
                  <th className="col-right col-lichess-rating">Lichess</th>
                  {showChallengeCol && <th className="col-action" />}
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
                    <td className="col-right col-lichess-rating">
                      {m.lichess_rapid_rating ?? '—'}
                    </td>
                    {showChallengeCol && (
                      <td className="col-action">
                        {challengeable.some((c) => c.lichess_id === m.lichess_id) && (
                          <button
                            className="btn btn-ghost challenge-btn"
                            disabled={!!challenging}
                            onClick={() => handleChallenge(m)}
                          >
                            {challenging === m.lichess_id ? '…' : 'Challenge'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {challengeResult && (
          <div className="panel challenge-result-panel">
            <p className="panel-label">Challenge sent to {challengeResult.defenderName}</p>
            <a
              href={challengeResult.url}
              className="btn btn-primary"
              target="_blank"
              rel="noreferrer"
            >
              Open on Lichess
            </a>
            <button className="btn btn-ghost" onClick={() => setChallengeResult(null)}>
              Dismiss
            </button>
          </div>
        )}
        {challengeError && (
          <p className="form-error" style={{ marginTop: '0.75rem' }}>{challengeError}</p>
        )}

        {members.length >= 2 && (
          <button className="btn btn-ghost btn-wide record-result-btn" onClick={onRecordResult}>
            Record Result
          </button>
        )}
      </main>
    </div>
  );
}

// ── Record result ──────────────────────────────────────────────────────────

function RecordResult({ group, user, onRecorded, onBack }) {
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [challengerId, setChallengerId] = useState('');
  const [defenderId, setDefenderId] = useState('');
  const [winner, setWinner] = useState('challenger');
  const [lichessGameId, setLichessGameId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/groups/${group.id}`)
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members ?? []);
        setLoadingMembers(false);
      });
  }, [group.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!challengerId || !defenderId) {
      setError('Please select both players.');
      return;
    }
    if (challengerId === defenderId) {
      setError('Challenger and defender must be different players.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: group.id,
          challenger_id: parseInt(challengerId, 10),
          defender_id: parseInt(defenderId, 10),
          winner,
          lichess_game_id: lichessGameId.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onRecorded();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const challengerName = members.find((m) => String(m.user_id) === challengerId)?.display_name;
  const defenderName = members.find((m) => String(m.user_id) === defenderId)?.display_name;

  return (
    <div className="page">
      <div className="board-texture" aria-hidden="true" />
      <Header onLogoClick={onBack} />
      <main className="form-main">
        <div className="form-card">
          <h1 className="form-title">Record a result</h1>
          <p className="form-subtitle">{group.name} · Season {group.season}</p>

          {loadingMembers ? (
            <div className="auth-status" style={{ padding: '2rem 0' }}>
              <span className="auth-status-icon spin">♞</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="challenger">Challenger</label>
                <select
                  id="challenger"
                  value={challengerId}
                  onChange={(e) => setChallengerId(e.target.value)}
                >
                  <option value="">Select challenger…</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name} (#{m.rank})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="defender">Defender</label>
                <select
                  id="defender"
                  value={defenderId}
                  onChange={(e) => setDefenderId(e.target.value)}
                >
                  <option value="">Select defender…</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name} (#{m.rank})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Result</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="winner"
                      value="challenger"
                      checked={winner === 'challenger'}
                      onChange={() => setWinner('challenger')}
                    />
                    {challengerName ? `${challengerName} wins` : 'Challenger wins'}
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="winner"
                      value="defender"
                      checked={winner === 'defender'}
                      onChange={() => setWinner('defender')}
                    />
                    {defenderName ? `${defenderName} wins` : 'Defender wins'}
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="winner"
                      value="draw"
                      checked={winner === 'draw'}
                      onChange={() => setWinner('draw')}
                    />
                    Draw
                  </label>
                </div>
              </div>

              <div className="field">
                <label htmlFor="lichess-game-id">Lichess game ID (optional)</label>
                <input
                  id="lichess-game-id"
                  type="text"
                  value={lichessGameId}
                  onChange={(e) => setLichessGameId(e.target.value)}
                  placeholder="e.g. abcd1234"
                  maxLength={20}
                />
              </div>

              {error && <p className="form-error">{error}</p>}

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving…' : 'Save result'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={onBack}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Router ─────────────────────────────────────────────────────────────────

const isCallback = window.location.pathname === '/auth/callback';
const isJoin = window.location.pathname.startsWith('/join/');
const joinCode = isJoin ? window.location.pathname.slice(6) : null;

export default function App() {
  const [user, setUser] = useState(() => (isCallback ? null : getUser()));
  const [inviteCode, setInviteCode] = useState(joinCode);
  const [page, setPage] = useState(() => {
    if (isCallback) return 'callback';
    if (isJoin && !getUser()) return 'join-login';
    if (isJoin && getUser()) return 'join';
    if (getUser()) return 'dashboard';
    return 'landing';
  });
  const [group, setGroup] = useState(null);

  // Redirect to Lichess OAuth when we have a pending invite but no session
  useEffect(() => {
    if (page === 'join-login') {
      sessionStorage.setItem('pending_invite', joinCode);
      initiateLogin();
    }
  }, []);

  function handleAuthSuccess(u, pendingCode) {
    setUser(u);
    if (pendingCode) {
      setInviteCode(pendingCode);
      setPage('join');
    } else {
      setPage('dashboard');
    }
  }

  function handleGroupCreated(g) {
    setGroup(g);
    setPage('group');
  }

  if (page === 'callback')
    return <AuthCallback onSuccess={handleAuthSuccess} />;

  if (page === 'join-login')
    return (
      <div className="page">
        <div className="board-texture" aria-hidden="true" />
        <div className="auth-status">
          <span className="auth-status-icon spin">♞</span>
          <p className="auth-status-text">Redirecting to Lichess…</p>
        </div>
      </div>
    );

  if (page === 'join' && inviteCode && user)
    return (
      <JoinPage
        inviteCode={inviteCode}
        user={user}
        onJoined={(g) => { setGroup(g); setPage('group'); }}
        onBack={() => setPage('dashboard')}
      />
    );

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
        onRecordResult={() => setPage('record-result')}
      />
    );

  if (page === 'record-result' && group && user)
    return (
      <RecordResult
        group={group}
        user={user}
        onRecorded={() => setPage('group')}
        onBack={() => setPage('group')}
      />
    );

  return <Landing />;
}
