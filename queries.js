// All hand-written SQL lives here so it's easy to audit / test in isolation.
// Functions take a `db` (better-sqlite3 connection) as the first argument so
// tests can pass in an isolated in-memory/temp database.

export function getBoardWithColumnsAndTasks(db, boardId) {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;

  const columns = db
    .prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position ASC, id ASC')
    .all(boardId);

  const taskStmt = db.prepare('SELECT * FROM tasks WHERE column_id = ? ORDER BY created_at DESC, id DESC');

  const columnsWithTasks = columns.map((col) => ({
    ...col,
    tasks: taskStmt.all(col.id),
  }));

  return { ...board, columns: columnsWithTasks };
}

export function createTask(db, { columnId, title, description, priority }) {
  const trimmedTitle = (title || '').trim();
  if (!trimmedTitle) {
    throw new Error('Title is required');
  }
  const stmt = db.prepare(
    `INSERT INTO tasks (column_id, title, description, priority)
     VALUES (@columnId, @title, @description, @priority)`
  );
  const info = stmt.run({
    columnId,
    title: trimmedTitle,
    description: description || null,
    priority: priority || 'Medium',
  });
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
}

export function updateTask(db, taskId, { title, description, priority }) {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!existing) return null;

  const newTitle = title !== undefined ? title.trim() : existing.title;
  if (!newTitle) {
    throw new Error('Title is required');
  }

  db.prepare(
    `UPDATE tasks SET title = ?, description = ?, priority = ? WHERE id = ?`
  ).run(
    newTitle,
    description !== undefined ? description : existing.description,
    priority !== undefined ? priority : existing.priority,
    taskId
  );

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
}

export function moveTask(db, taskId, columnId) {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!existing) return null;

  const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(columnId);
  if (!column) throw new Error('Target column does not exist');

  db.prepare('UPDATE tasks SET column_id = ? WHERE id = ?').run(columnId, taskId);
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
}

export function deleteTask(db, taskId) {
  const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  return info.changes > 0;
}

// --- Required "non-trivial" query #1 ---
// Count of tasks per column on a board (a GROUP BY / aggregate query,
// joined against columns so empty columns still show a count of 0).
export function getTaskCountsPerColumn(db, boardId) {
  return db
    .prepare(
      `SELECT c.id AS column_id, c.name AS column_name, COUNT(t.id) AS task_count
       FROM columns c
       LEFT JOIN tasks t ON t.column_id = c.id
       WHERE c.board_id = ?
       GROUP BY c.id, c.name
       ORDER BY c.position ASC, c.id ASC`
    )
    .all(boardId);
}

// --- Required "non-trivial" query #2 ---
// Tasks with a given priority, newest first, scoped to a board via a join
// through columns (so we don't leak tasks from other boards).
export function getTasksByPriority(db, boardId, priority) {
  return db
    .prepare(
      `SELECT t.*, c.name AS column_name
       FROM tasks t
       JOIN columns c ON c.id = t.column_id
       WHERE c.board_id = ? AND t.priority = ?
       ORDER BY t.created_at DESC, t.id DESC`
    )
    .all(boardId, priority);
}
