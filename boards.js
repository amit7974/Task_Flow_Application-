import { Router } from 'express';
import { getBoardWithColumnsAndTasks, getTaskCountsPerColumn, getTasksByPriority } from '../db/queries.js';

export default function boardsRouter(db) {
  const router = Router();

  // GET /api/boards/:id - full board with nested columns + tasks
  router.get('/:id', (req, res) => {
    const board = getBoardWithColumnsAndTasks(db, Number(req.params.id));
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  });

  // GET /api/boards/:id/stats - task count per column (aggregate query)
  router.get('/:id/stats', (req, res) => {
    const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    const counts = getTaskCountsPerColumn(db, Number(req.params.id));
    res.json(counts);
  });

  // GET /api/boards/:id/tasks?priority=High - tasks filtered by priority, newest first
  router.get('/:id/tasks', (req, res) => {
    const { priority } = req.query;
    if (!priority) return res.status(400).json({ error: 'priority query param is required' });
    if (!['Low', 'Medium', 'High'].includes(priority)) {
      return res.status(400).json({ error: 'priority must be one of Low, Medium, High' });
    }
    const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    const tasks = getTasksByPriority(db, Number(req.params.id), priority);
    res.json(tasks);
  });

  return router;
}
