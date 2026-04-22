export default function App() {
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
            <button className="btn btn-primary">Create a group</button>
            <button className="btn btn-ghost">Join a group</button>
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
