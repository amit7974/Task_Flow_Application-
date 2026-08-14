import express from 'express';
import cors from 'cors';
import boardsRouter from './routes/boards.js';
import tasksRouter from './routes/tasks.js';

export function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use('/api/boards', boardsRouter(db));
  app.use('/api/tasks', tasksRouter(db));

  // Fallback error handler for anything unexpected
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
