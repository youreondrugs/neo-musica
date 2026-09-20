# Neo Musica

Neo Musica is the foundation for a music discovery website where unknown artists can upload songs and listeners can discover random tracks from the community.

This repository currently contains boilerplate only. It intentionally does not include authentication, uploads, random playback, likes, points, tiers, profile customization, or database models yet.

## Project Structure

```text
neo-musica/
  backend/      Express API foundation
  frontend/     Vite + React app foundation
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
