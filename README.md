# Neo Musica

Neo Musica is the foundation for a music discovery website where unknown artists can upload songs and listeners can discover random tracks from the community.

This repository currently contains the first small product slices: registration, login, logout, a simple profile view, and SQLite-backed user/session storage. It intentionally does not include uploads, random playback, likes, points, tiers, or profile customization yet.

## Project Structure

```text
neo-musica/
  backend/      Express API foundation
  frontend/     Vite + React app foundation
  backend/data/ Local SQLite database files, ignored by Git
  .env.example  Environment variable template
```

## Requirements

- Node.js 20 or newer
- pnpm 9 or newer

## Setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The frontend runs on `http://localhost:5173`.

The backend runs on `http://localhost:4000`.

The local SQLite database is created at `backend/data/neo-musica.sqlite` by default.

## Useful Commands

```bash
pnpm dev            # Start frontend and backend together
pnpm dev:frontend   # Start only the frontend
pnpm dev:backend    # Start only the backend
pnpm test           # Run all tests
pnpm lint           # Run ESLint
pnpm format         # Format the codebase
pnpm build          # Build the frontend
```

## API

```http
GET /api/health
```

Returns a simple health-check response from the backend.

```http
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
POST /api/auth/logout
```

These auth endpoints use local SQLite storage. Accounts and sessions persist across backend restarts on your machine.
