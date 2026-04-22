# Gambit — Claude Code Context

## What is Gambit

Gambit is a **private chess ladder platform for teams and friend groups**, powered by Lichess. It lets a closed group of people run a ranked ladder — track game results, maintain ratings, and climb the standings against people they actually know. It is not a public matchmaking service; every ladder is invite-only.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite (`/client`) |
| Backend | Node.js (ESM) + Express 4 (`/server`) |
| Database | PostgreSQL (via `pg`) |
| Chess platform | Lichess (OAuth + game API) |

The server runs on port `3001`, the client dev server on `5173` with Vite proxying `/api/*` to the backend.

## Core User Flow

1. **Create a group** — an admin creates a private ladder and gets a shareable invite link.
2. **Invite via link** — members join by visiting the invite URL; no account creation required beyond connecting Lichess.
3. **Connect Lichess account** — members authenticate via Lichess OAuth; their Lichess username becomes their identity.
4. **Challenge someone above you** — any member can challenge a player ranked higher on the ladder.
5. **Play on Lichess** — the actual game is played on Lichess.org in a normal Lichess game.
6. **Ladder auto-updates** — after the game completes, the ladder fetches the result from Lichess and updates standings automatically. Manual result entry is also supported as a fallback.

## Key Features

- **Private groups** — each ladder is invite-only; no public discovery.
- **Lichess OAuth** — identity and game history are tied to real Lichess accounts.
- **Mobile-first UI** — designed for phones first; desktop is secondary.
- **Glicko ratings** — standings use Glicko rating calculations, not simple win/loss counting.
- **Seasonal resets** — admins can reset the ladder at the end of a season while preserving history.
- **Manual result entry** — members can log results directly if the Lichess API doesn't capture the game.

## Project Structure

```
gambit/
├── client/                  # React frontend (Vite)
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── index.css
├── server/                  # Express API
│   ├── .env.example
│   └── src/
│       ├── index.js         # App entry point, middleware, route registration
│       ├── db.js            # PostgreSQL connection pool
│       └── routes/          # One file per resource (health, groups, users, …)
├── README.md
└── CLAUDE.md                # This file
```

### Dev commands

```bash
# Backend
cd server && npm run dev     # node --watch, restarts on file change

# Frontend
cd client && npm run dev     # Vite HMR dev server
```

### Environment (server/.env)

```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/gambit
CLIENT_ORIGIN=http://localhost:5173
```

## Coding Principles

- **Keep it simple.** No premature abstractions. Three similar lines of code are better than a helper that's only called twice.
- **Mobile-first.** Design and test on small screens first. Desktop layout is an enhancement, not the baseline.
- **End-to-end before moving on.** Every feature must work fully — UI, API, and database — before starting the next one. No half-built features.
- **No comments explaining what the code does.** Only add a comment when the *why* is non-obvious: a workaround, a hidden constraint, a subtle invariant.
- **No unnecessary error handling.** Trust internal code and framework guarantees. Only validate at system boundaries (user input, Lichess API responses).
- **ESM throughout.** Both `server` and `client` use `"type": "module"`. Use `import`/`export`, never `require`.
