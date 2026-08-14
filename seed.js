import { createConnection } from './db.js';

function seed(db) {
  const boardCount = db.prepare('SELECT COUNT(*) AS n FROM boards').get().n;
  if (boardCount > 0) {
    console.log('Database already has data — skipping seed. Delete taskflow.db to reseed.');
    return;
  }

  const insertBoard = db.prepare('INSERT INTO boards (name) VALUES (?)');
  const boardId = insertBoard.run('Product Launch').lastInsertRowid;

  const insertColumn = db.prepare(
    'INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)'
  );
  const todoId = insertColumn.run(boardId, 'To Do', 0).lastInsertRowid;
  const inProgressId = insertColumn.run(boardId, 'In Progress', 1).lastInsertRowid;
  const doneId = insertColumn.run(boardId, 'Done', 2).lastInsertRowid;

  const insertTask = db.prepare(
    `INSERT INTO tasks (column_id, title, description, priority) VALUES (?, ?, ?, ?)`
  );

  insertTask.run(todoId, 'Write launch announcement blog post', 'Draft + get sign-off from marketing', 'High');
  insertTask.run(todoId, 'Set up analytics dashboard', null, 'Medium');
  insertTask.run(todoId, 'Buy celebratory donuts', 'Optional but morale matters', 'Low');
  insertTask.run(inProgressId, 'Fix onboarding flow bug', 'Users get stuck on step 2', 'High');
  insertTask.run(inProgressId, 'Write API documentation', null, 'Medium');
  insertTask.run(doneId, 'Design landing page', 'Approved by design lead', 'Medium');
  insertTask.run(doneId, 'Set up staging environment', null, 'Low');

  console.log(`Seeded board #${boardId} with 3 columns and 7 tasks.`);
}

// Only run automatically when executed directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  const db = createConnection();
  seed(db);
  db.close();
}

export { seed };
