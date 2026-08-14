# TaskFlow

A small full-stack task board: a Board with Columns, each holding Tasks. Built for the TaskFlow
take-home assignment.

- **Frontend:** React (Vite, JavaScript)
- **Backend:** Node.js + Express
- **Database:** SQLite (via `better-sqlite3`)

## Project structure

```
taskflow/
  backend/     Express API + SQLite database
  frontend/    React app (Vite)
```

## Quick start (from a fresh clone)

You'll need Node.js 18+ installed. Two terminals — one for the API, one for the UI.

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

This starts the API on **http://localhost:3001**. On first run it creates `taskflow.db` in the
`backend/` folder, applies the schema, and seeds it with one board, three columns, and seven
tasks (see `src/db/seed.js`). If the database already has data, seeding is skipped automatically,
so it's safe to restart the server without wiping your data.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # points the app at http://localhost:3001/api
npm run dev
```

Open **http://localhost:5173**. The board loads from the backend, and every change (create, edit,
move, delete) is persisted — reloading the page shows the same data.

### Running tests

```bash
cd backend
npm test
```

9 tests covering: rejecting an empty/whitespace title, moving a task updates its column, deleting a
task, editing a task, and the two database query functions run directly against seeded data
(`tests/db.test.js`, `tests/tasks.test.js`).

## Database

### Schema

See [`backend/src/db/schema.sql`](backend/src/db/schema.sql) for the full file. Summary:

```sql
CREATE TABLE boards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE columns (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id   INTEGER NOT NULL,
  name       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE TABLE tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  column_id   INTEGER NOT NULL,
  title       TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT,
  priority    TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
);
```

A task's "status" is modeled as `column_id` — which column it currently belongs to — rather than a
separate status enum, since the two are always the same thing on a board like this.

### The two required non-trivial queries

Both live in [`backend/src/db/queries.js`](backend/src/db/queries.js) and are exercised directly
by `backend/tests/db.test.js`.

**1. Count of tasks per column on a board** (`getTaskCountsPerColumn`) — a `GROUP BY` with a
`LEFT JOIN` so a column with zero tasks still shows `0` instead of disappearing:

```sql
SELECT c.id AS column_id, c.name AS column_name, COUNT(t.id) AS task_count
FROM columns c
LEFT JOIN tasks t ON t.column_id = c.id
WHERE c.board_id = ?
GROUP BY c.id, c.name
ORDER BY c.position ASC, c.id ASC
```

Exposed at `GET /api/boards/:id/stats`.

**2. Tasks with a given priority, newest first** (`getTasksByPriority`) — joins through `columns`
so results are scoped to one board rather than leaking tasks from other boards:

```sql
SELECT t.*, c.name AS column_name
FROM tasks t
JOIN columns c ON c.id = t.column_id
WHERE c.board_id = ? AND t.priority = ?
ORDER BY t.created_at DESC, t.id DESC
```

Exposed at `GET /api/boards/:id/tasks?priority=High`, and used by the frontend's priority filter
(client-side filtering is also applied for instant feedback, but the endpoint itself queries the
database rather than the client filtering everything after fetching it all).

### Seed data

`backend/src/db/seed.js` inserts one board ("Product Launch"), three columns (To Do / In Progress
/ Done), and seven tasks spread across them with a mix of priorities, so the app isn't empty on
first run.

## API

| Method | Path                              | Purpose                                    |
|--------|-----------------------------------|---------------------------------------------|
| GET    | `/api/boards/:id`                 | Board with nested columns and tasks         |
| GET    | `/api/boards/:id/stats`           | Task count per column (query #1)            |
| GET    | `/api/boards/:id/tasks?priority=` | Tasks by priority, newest first (query #2)  |
| POST   | `/api/tasks`                      | Create a task                               |
| PUT    | `/api/tasks/:id`                  | Edit a task's title/description/priority    |
| PUT    | `/api/tasks/:id/move`             | Move a task to a different column           |
| DELETE | `/api/tasks/:id`                  | Delete a task                               |

Validation (empty title, invalid priority, nonexistent column) is enforced on the backend, not
just in the form — the frontend also checks first for a snappier UI, but a request that skips the
UI (e.g. via curl) is still rejected with a 400 and a message.

## Frontend notes

- Task moves support **both** drag-and-drop between columns and a "Move to" dropdown on each
  card (for touch devices, keyboard use, or when drag-and-drop just isn't convenient). Moves are
  applied optimistically in the UI and rolled back with an error banner if the request fails.
- Priority filter and a title search box are both implemented (search was listed as a nice-to-have).
- Failed requests never show a blank screen — the board view shows a retry state, and
  create/edit/delete/move failures surface an inline or banner error message.

## Decisions & assumptions

- **Single board, hardcoded ID.** The spec describes one board with columns and tasks; there's no
  requirement for a board list/switcher UI, so the frontend always loads board `1` and the backend
  doesn't restrict itself to one board (the schema and queries are board-aware, so adding a board
  picker later wouldn't require schema changes).
- **Status = column membership.** Rather than a separate `status` column that has to be kept in
  sync with `column_id`, a task's status *is* which column it's in. Simpler, and there's no way for
  the two to drift out of sync.
- **Priority defaults to Medium** when not specified on creation, since the spec says priority is
  optional on the create form.
- **Move endpoint is separate from the general edit endpoint** (`PUT /tasks/:id/move` vs.
  `PUT /tasks/:id`) so drag-and-drop and the dropdown only ever send a `columnId`, rather than
  re-sending the whole task on every move.
- **Both drag-and-drop and a dropdown for moving tasks**, rather than picking just one — the spec
  allows either, and both together didn't add much time given React's native HTML5 drag events
  and a single `<select>`.
- **No ORM.** Used `better-sqlite3` directly with hand-written SQL, since the assignment
  specifically wants to see real queries rather than default ORM methods.

## What I'd add with more time

- A proper multi-board UI (board picker, create/rename/delete boards).
- Optimistic UI for create/edit as well (currently only move and delete are optimistic; create/edit
  wait for the server round-trip before closing the modal).
- Keyboard-accessible drag-and-drop (e.g. arrow keys to reorder/move a focused card) as a
  complement to the mouse-based drag-and-drop and the dropdown fallback.
- Task reordering *within* a column (currently tasks are ordered by creation date; there's no
  manual ordering).
- E2E tests with Playwright covering the actual browser drag-and-drop interaction, on top of the
  current backend test suite.

## Time spent

Roughly 3–4 hours end to end: schema and backend first, then the API layer and tests, then the
React UI, then this write-up.

## Something I looked up along the way

I hadn't used `better-sqlite3`'s synchronous API before — most Node SQLite libraries lean on
callbacks or promises, but `better-sqlite3` runs queries synchronously on the same thread, which
turns out to be totally fine (and pleasant to write) for a single-process app like this one, since
SQLite itself is the bottleneck either way and there's no connection pool to juggle. It made the
query functions in `queries.js` much easier to unit test directly, without needing `async/await`
noise or a running server.
