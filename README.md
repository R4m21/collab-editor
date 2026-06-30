# CollabEdit — Local-First Collaborative Document Editor

Real-time collaborative document editor with offline-first architecture, CRDT-based conflict resolution, and granular version control.

## Features

- **Local-First Architecture** — Edit documents without any network requests. All changes persist in IndexedDB via Dexie.js.
- **Background Sync Engine** — When back online, queued updates flush automatically to the server.
- **CRDT Conflict Resolution** — Powered by Yjs for mathematically guaranteed, deterministic conflict-free merging.
- **Real-Time Collaboration** — Live cursors, presence indicators, and instant sync via WebSocket (Hocuspocus).
- **Version History** — Named snapshots with full time-travel restore that doesn't corrupt collaborators' work.
- **Role-Based Access** — Owner / Editor / Viewer roles with server-enforced permissions.
- **AI Assistant** — Summarize, fix grammar, expand, or rewrite content using Groq LLaMA.
- **Security** — Payload size limits (512KB), Yjs update validation, JWT auth, route guards.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 + TypeScript |
| Editor | TipTap v3 |
| CRDT | Yjs + y-indexeddb |
| Real-time | y-websocket / Hocuspocus |
| Auth | NextAuth.js v5 |
| Database | PostgreSQL + Prisma ORM |
| AI | Vercel AI SDK + Groq |
| Styling | Tailwind CSS |
| Deploy | Vercel + Neon |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/R4m21/collab-editor
cd collab-editor
npm install
cd server
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:
- `DATABASE_URL` — PostgreSQL connection string (use [Neon](https://neon.tech) for free)
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `GROQ_API_KEY` — free at [console.groq.com](https://console.groq.com)

### 3. Database setup

```bash
npm run db:generate
npm run db:push
```

### 4. Run development servers

Terminal 1 (Next.js):
```bash
npm run dev
```

Terminal 2 (WebSocket server):
```bash
cd server
node server/ws-server.js
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

### Local-First Flow

```
User types → TipTap → Yjs Doc → IndexedDB (instant)
                              ↓
                         Hocuspocus Provider (if online) → Other clients
                              ↓
                         REST API sync (background) → PostgreSQL
```

### Offline Sync

1. User edits while offline → Yjs updates saved to IndexedDB
2. `queueUpdate()` adds updates to IndexedDB sync queue
3. `window.addEventListener('online')` triggers `flushSyncQueue()`
4. Each queued update POSTed to `/api/documents/[id]/sync`
5. Server validates (size, schema) and merges with stored Yjs state

### Conflict Resolution (CRDT)

Yjs uses a Conflict-free Replicated Data Type (CRDT) algorithm. Concurrent edits are merged deterministically — no matter the order updates arrive, all clients converge to the same final state. No "last write wins" data loss.

### Version History

Versions are Yjs state vectors (binary snapshots) stored in PostgreSQL. Restoring a version applies the snapshot as a new Yjs update — non-destructive, and syncs to all active collaborators.

## Security

- **Payload limits**: 512KB hard limit on sync payloads
- **Yjs validation**: All updates tested against a real Yjs doc before applying
- **Role enforcement**: Viewers blocked from sync endpoint server-side
- **JWT sessions**: All API routes check authentication
- **Prisma scoping**: All queries scoped to authenticated user's memberships

## License

MIT

---

Built by [Maniram](https://github.com/R4m21) · [LinkedIn](https://www.linkedin.com/in/maniram-chauhan)
