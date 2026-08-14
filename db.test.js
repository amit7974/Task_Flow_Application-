import fs from 'fs';
import path from 'path';
import { createConnection } from '../src/db/db.js';
import { seed } from '../src/db/seed.js';
import { getTaskCountsPerColumn, getTasksByPriority } from '../src/db/queries.js';

const TEST_DB_PATH = path.join(process.cwd(), 'test-db.db');

let db;
let boardId;

beforeEach(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  db = createConnection(TEST_DB_PATH);
  seed(db);
  boardId = db.prepare('SELECT id FROM boards LIMIT 1').get().id;
});

afterEach(() => {
  db.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

test('getTaskCountsPerColumn returns correct counts for known seed data', () => {
  const counts = getTaskCountsPerColumn(db, boardId);
  // Seed data: To Do=3, In Progress=2, Done=2
  const byName = Object.fromEntries(counts.map((c) => [c.column_name, c.task_count]));
  expect(byName['To Do']).toBe(3);
  expect(byName['In Progress']).toBe(2);
  expect(byName['Done']).toBe(2);
});

test('getTasksByPriority returns only matching tasks, newest first', () => {
  const highPriorityTasks = getTasksByPriority(db, boardId, 'High');
  expect(highPriorityTasks.length).toBe(2);
  expect(highPriorityTasks.every((t) => t.priority === 'High')).toBe(true);

  // newest first: created_at should be non-increasing
  for (let i = 1; i < highPriorityTasks.length; i++) {
    expect(highPriorityTasks[i - 1].id).toBeGreaterThanOrEqual(highPriorityTasks[i].id);
  }
});
