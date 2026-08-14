import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Allow overriding the DB file path (used by tests to get an isolated DB).
const DB_PATH = process.env.TASKFLOW_DB_PATH || path.join(__dirname, '..', '..', 'taskflow.db');

export function createConnection(dbPath = DB_PATH) {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  return db;
}

// Default shared connection used by the running server.
const db = createConnection();

export default db;
