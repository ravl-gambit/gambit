-- Users: one row per Lichess account that has connected to Gambit
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  lichess_id      TEXT NOT NULL UNIQUE,   -- Lichess username (lowercase)
  display_name    TEXT NOT NULL,          -- display name from Lichess profile
  access_token    TEXT,                   -- Lichess OAuth token
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Groups: a private ladder (e.g. "Work Chess Club")
CREATE TABLE IF NOT EXISTS groups (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  invite_code     TEXT NOT NULL UNIQUE,   -- random token used in invite links
  created_by      INTEGER NOT NULL REFERENCES users(id),
  season          INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Group members: which users belong to which group, with their current ladder position
CREATE TABLE IF NOT EXISTS group_members (
  id              SERIAL PRIMARY KEY,
  group_id        INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  rating          NUMERIC(7, 2) NOT NULL DEFAULT 1500,  -- Glicko rating
  rating_deviation NUMERIC(7, 2) NOT NULL DEFAULT 350,  -- Glicko RD
  rank            INTEGER,                              -- cached ladder rank (1 = top)
  season          INTEGER NOT NULL DEFAULT 1,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id, season)
);

-- Ladder results: one row per completed game
CREATE TABLE IF NOT EXISTS ladder_results (
  id              SERIAL PRIMARY KEY,
  group_id        INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  challenger_id   INTEGER NOT NULL REFERENCES users(id),
  defender_id     INTEGER NOT NULL REFERENCES users(id),
  winner_id       INTEGER REFERENCES users(id),        -- NULL = draw
  lichess_game_id TEXT,                                -- e.g. "abcd1234" from lichess.org/abcd1234
  season          INTEGER NOT NULL DEFAULT 1,
  played_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for the most common lookups
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id, season);
CREATE INDEX IF NOT EXISTS idx_ladder_results_group ON ladder_results(group_id, season);
CREATE INDEX IF NOT EXISTS idx_ladder_results_players ON ladder_results(challenger_id, defender_id);
