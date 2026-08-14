import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createConnection } from '../src/db/db.js';
import { createApp } from '../src/app.js';
import { seed } from '../src/db/seed.js';

const TEST_DB_PATH = path.join(process.cwd(), 'test-tasks.db');

let db;
let app;
let boardId;
let todoColumnId;
let inProgressColumnId;

beforeEach(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  db = createConnection(TEST_DB_PATH);
  seed(db);
  app = createApp(db);

  const board = db.prepare('SELECT * FROM boards LIMIT 1').get();
  boardId = board.id;
  const cols = db.prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position').all(boardId);
  todoColumnId = cols[0].id;
  inProgressColumnId = cols[1].id;
});

afterEach(() => {
  db.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

describe('POST /api/tasks', () => {
  test('rejects creating a task with no title', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ columnId: todoColumnId, title: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('rejects a title that is only whitespace', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ columnId: todoColumnId, title: '   ' });
    expect(res.status).toBe(400);
  });

  test('creates a task with a valid title', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ columnId: todoColumnId, title: 'New task', priority: 'High' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New task');
    expect(res.body.priority).toBe('High');
  });
});

describe('PUT /api/tasks/:id/move', () => {
  test('moving a task updates its column (status)', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .send({ columnId: todoColumnId, title: 'Move me' });
    const taskId = created.body.id;

    const moved = await request(app)
      .put(`/api/tasks/${taskId}/move`)
      .send({ columnId: inProgressColumnId });

    expect(moved.status).toBe(200);
    expect(moved.body.column_id).toBe(inProgressColumnId);

    // Confirm it persisted by re-fetching the board
    const board = await request(app).get(`/api/boards/${boardId}`);
    const inProgressCol = board.body.columns.find((c) => c.id === inProgressColumnId);
    expect(inProgressCol.tasks.some((t) => t.id === taskId)).toBe(true);
  });

  test('moving a nonexistent task returns 404', async () => {
    const res = await request(app)
      .put('/api/tasks/999999/move')
      .send({ columnId: inProgressColumnId });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  test('deletes an existing task', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .send({ columnId: todoColumnId, title: 'Delete me' });
    const res = await request(app).delete(`/api/tasks/${created.body.id}`);
    expect(res.status).toBe(204);

    const board = await request(app).get(`/api/boards/${boardId}`);
    const todoCol = board.body.columns.find((c) => c.id === todoColumnId);
    expect(todoCol.tasks.some((t) => t.id === created.body.id)).toBe(false);
  });
});

describe('PUT /api/tasks/:id', () => {
  test('rejects editing a task to have an empty title', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .send({ columnId: todoColumnId, title: 'Edit me' });
    const res = await request(app)
      .put(`/api/tasks/${created.body.id}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });
});
