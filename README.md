# Gambit

A private chess ladder platform for teams and friend groups, powered by Lichess.

Gambit lets you run a ranked chess ladder within a closed group — track results, maintain ratings, and climb the standings against people you actually know.

## Stack

- **Frontend**: React + Vite (`/client`)
- **Backend**: Node.js + Express (`/server`)
- **Database**: PostgreSQL

## Project structure

```
gambit/
├── client/          # React frontend (Vite)
│   └── src/
├── server/          # Express API
│   └── src/
│       ├── index.js
│       ├── db.js
│       └── routes/
└── README.md
```

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL

### Backend

```bash
cd server
cp .env.example .env   # fill in your DATABASE_URL
npm install
npm run dev
```

The API runs on `http://localhost:3001`. Check `GET /health` to verify the database connection.

### Frontend

```bash
cd client
npm install
npm run dev
```

The app runs on `http://localhost:5173`. API requests to `/api/*` are proxied to the backend.
