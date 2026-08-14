import { Router } from 'express';
import { createTask, updateTask, moveTask, deleteTask } from '../db/queries.js';

export default function tasksRouter(db) {
  const router = Router();

  // POST /api/tasks - create a task
  router.post('/', (req, res) => {
    const { columnId, title, description, priority } = req.body;

    if (!columnId) return res.status(400).json({ error: 'columnId is required' });
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
    if (priority && !['Low', 'Medium', 'High'].includes(priority)) {
      return res.status(400).json({ error: 'priority must be one of Low, Medium, High' });
    }

    const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(columnId);
    if (!column) return res.status(400).json({ error: 'columnId does not refer to an existing column' });

    try {
      const task = createTask(db, { columnId, title, description, priority });
      res.status(201).json(task);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // PUT /api/tasks/:id - edit a task
  router.put('/:id', (req, res) => {
    const { title, description, priority } = req.body;
    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ error: 'title cannot be empty' });
    }
    if (priority && !['Low', 'Medium', 'High'].includes(priority)) {
      return res.status(400).json({ error: 'priority must be one of Low, Medium, High' });
    }
    try {
      const task = updateTask(db, Number(req.params.id), { title, description, priority });
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // PUT /api/tasks/:id/move - move a task to a different column
  router.put('/:id/move', (req, res) => {
    const { columnId } = req.body;
    if (!columnId) return res.status(400).json({ error: 'columnId is required' });
    try {
      const task = moveTask(db, Number(req.params.id), Number(columnId));
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE /api/tasks/:id
  router.delete('/:id', (req, res) => {
    const deleted = deleteTask(db, Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Task not found' });
    res.status(204).send();
  });

  return router;
}
